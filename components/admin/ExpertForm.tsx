'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { ConsultStatus, Expert, Vertical } from '@/lib/types';
import { STATUS_LABEL, VERTICAL_LABEL } from '@/lib/constants';

type CategoryOption = { code: string; vertical: string; level: number; label: string };

const VERTICALS: Vertical[] = ['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser'];
const STATUSES: ConsultStatus[] = ['available', 'delayed', 'unavailable'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  name: z.string().trim().min(1, '이름 필수').max(50),
  vertical: z.enum(['lawyer', 'doctor', 'labor', 'patent', 'tax', 'adjuster', 'appraiser']),
  license: z.string().trim().max(30).optional(),
  specialties: z.string(),
  region: z.string().trim().min(1, '지역 필수').max(50),
  phone: z.string().trim().regex(/^[0-9-]{7,20}$/, '전화 형식(숫자·하이픈 7~20)'),
  experience_years: z.coerce.number().int().min(0).max(80),
  bio: z.string().max(300).optional(),
  youtube_url: z.string().url('URL 형식').or(z.literal('')).optional(),
  status: z.enum(['available', 'delayed', 'unavailable']),
  weekday_start: z.string().regex(HHMM, 'HH:mm').or(z.literal('')).optional(),
  weekday_end: z.string().regex(HHMM, 'HH:mm').or(z.literal('')).optional(),
  weekend_available: z.boolean(),
  night_available: z.boolean(),
  is_active: z.boolean(),
});

export function ExpertForm({
  initial, onClose, onSaved,
}: { initial?: Expert; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    vertical: (initial?.vertical ?? 'lawyer') as Vertical,
    license: initial?.license ?? '',
    specialties: (initial?.specialties ?? []).join('|'),
    region: initial?.region ?? '',
    phone: initial?.phone ?? '',
    experience_years: String(initial?.experience_years ?? 0),
    bio: initial?.bio ?? '',
    youtube_url: initial?.youtube_url ?? '',
    status: (initial?.status ?? 'available') as ConsultStatus,
    weekday_start: initial?.weekday_start?.slice(0, 5) ?? '09:00',
    weekday_end: initial?.weekday_end?.slice(0, 5) ?? '18:00',
    weekend_available: initial?.weekend_available ?? false,
    night_available: initial?.night_available ?? false,
    is_active: initial?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 카테고리: 전체 로드 후 선택 vertical 의 중분류(level 1)만 노출
  const [allCats, setAllCats] = useState<CategoryOption[]>([]);
  const [categoryCodes, setCategoryCodes] = useState<string[]>(initial?.category_codes ?? []);
  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setAllCats(d.categories ?? []))
      .catch(() => {});
  }, []);
  const verticalCats = allCats.filter((c) => c.level === 1 && c.vertical === form.vertical);
  const toggleCat = (code: string) =>
    setCategoryCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // vertical 변경 시 다른 직업의 카테고리 선택 해제
  const changeVertical = (v: Vertical) => {
    set('vertical', v);
    setCategoryCodes((prev) => prev.filter((code) => allCats.some((c) => c.code === code && c.vertical === v)));
  };

  const submit = async () => {
    setError('');
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    const payload = {
      ...parsed.data,
      specialties: parsed.data.specialties.split('|').map((s) => s.trim()).filter(Boolean),
      license: parsed.data.license?.trim() || null,
      youtube_url: parsed.data.youtube_url || null,
      bio: parsed.data.bio || null,
      weekday_start: parsed.data.weekday_start || null,
      weekday_end: parsed.data.weekday_end || null,
      category_codes: categoryCodes,
    };
    const res = await fetch(
      initial ? `/api/admin/experts/${initial.id}` : '/api/admin/experts',
      {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || '저장 실패'); return; }
    onSaved();
  };

  const field = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-slate-900">
          {initial ? '전문가 수정' : '전문가 신규'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <input className={field} placeholder="이름" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <select className={field} value={form.vertical} onChange={(e) => changeVertical(e.target.value as Vertical)}>
            {VERTICALS.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]} ({v})</option>)}
          </select>
          <input className={`${field} col-span-2`} placeholder="자격 표시명 (세무·회계는 세무사/회계사 입력 · 비우면 직업명)" value={form.license} onChange={(e) => set('license', e.target.value)} />
          <input className={field} placeholder="지역" value={form.region} onChange={(e) => set('region', e.target.value)} />
          <input className={field} placeholder="전화 (02-1234-5678)" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <input className={field} placeholder="경력(년)" value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
          <input className={field} placeholder="전문분야 (형사|사기)" value={form.specialties} onChange={(e) => set('specialties', e.target.value)} />
          <input className={`${field} col-span-2`} placeholder="유튜브 URL (선택)" value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} />
          <textarea className={`${field} col-span-2`} rows={2} placeholder="소개 (선택)" value={form.bio} onChange={(e) => set('bio', e.target.value)} />

          <div className="col-span-2">
            <div className="mb-1 text-xs text-slate-500">
              전문 카테고리 <span className="text-slate-400">({VERTICAL_LABEL[form.vertical]} · 복수 선택, {categoryCodes.length}개)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-200 p-2">
              {verticalCats.length === 0 ? (
                <span className="text-xs text-slate-400">카테고리 없음</span>
              ) : verticalCats.map((c) => {
                const on = categoryCodes.includes(c.code);
                return (
                  <button
                    type="button" key={c.code} onClick={() => toggleCat(c.code)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="col-span-2 flex flex-col gap-1 text-xs text-slate-500">
            상담 상태
            <select className={field} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} ({s})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            평일 시작
            <input type="time" className={field} value={form.weekday_start} onChange={(e) => set('weekday_start', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            평일 종료
            <input type="time" className={field} value={form.weekday_end} onChange={(e) => set('weekday_end', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.weekend_available} onChange={(e) => set('weekend_available', e.target.checked)} /> 주말 상담
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.night_available} onChange={(e) => set('night_available', e.target.checked)} /> 야간 상담
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> 활성
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">취소</button>
          <button onClick={submit} disabled={saving} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
