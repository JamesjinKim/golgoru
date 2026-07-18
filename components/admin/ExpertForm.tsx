'use client';
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { z } from 'zod';
import { ConsultStatus, Expert, Vertical } from '@/lib/types';
import { STATUS_LABEL, VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import { MAX_YOUTUBE_LINKS } from '@/lib/experts/youtube';
import { adminFetch } from '@/lib/admin/adminFetch';
import ExpertAvatar from '@/components/ExpertAvatar';

type CategoryOption = { code: string; vertical: string; level: number; label: string };

// 신규 등록 드롭다운은 노출 직역만. 편집 중인 값이 숨김 직역이면 아래에서 별도 보존.
const VERTICALS: Vertical[] = VISIBLE_VERTICALS;
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
    status: (initial?.status ?? 'available') as ConsultStatus,
    weekday_start: initial?.weekday_start?.slice(0, 5) ?? '09:00',
    weekday_end: initial?.weekday_end?.slice(0, 5) ?? '18:00',
    weekend_available: initial?.weekend_available ?? false,
    night_available: initial?.night_available ?? false,
    is_active: initial?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);

  // 유튜브 링크: 동적 입력 행(최대 MAX_YOUTUBE_LINKS). 최소 1행 유지(빈 입력은 저장 시 제외).
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(() => {
    const init = initial?.youtube_urls?.length
      ? initial.youtube_urls
      : initial?.youtube_url ? [initial.youtube_url] : [];
    return init.length ? init.slice(0, MAX_YOUTUBE_LINKS) : [''];
  });
  const setYoutubeAt = (i: number, v: string) =>
    setYoutubeUrls((list) => list.map((x, idx) => (idx === i ? v : x)));
  const addYoutube = () =>
    setYoutubeUrls((list) => (list.length < MAX_YOUTUBE_LINKS ? [...list, ''] : list));
  const removeYoutube = (i: number) =>
    setYoutubeUrls((list) => {
      const next = list.filter((_, idx) => idx !== i);
      return next.length ? next : [''];
    });

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || !initial?.id) return; // 신규 전문가는 저장 후 업로드
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch(`/api/admin/experts/${initial.id}/photo`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '업로드 실패');
      setPhotoUrl(json.photo_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      input.value = '';
    }
  }

  // 카테고리: 전체 로드 후 선택 vertical 의 중분류(level 1)만 노출
  const [allCats, setAllCats] = useState<CategoryOption[]>([]);
  const [categoryCodes, setCategoryCodes] = useState<string[]>(initial?.category_codes ?? []);
  useEffect(() => {
    adminFetch('/api/admin/categories')
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
    // 운영 필수: 전문분야·전문 카테고리는 1개 이상 (추천 매칭·미니홈피 표시 기준)
    const specialties = parsed.data.specialties.split('|').map((s) => s.trim()).filter(Boolean);
    if (specialties.length === 0) { setError('전문분야를 1개 이상 입력하세요 (예: 형사|사기)'); return; }
    if (categoryCodes.length === 0) { setError('전문 카테고리를 1개 이상 선택하세요'); return; }
    // 유튜브 링크: 빈 행 제외, 각 URL 형식 검증, 최대 개수 제한
    const youtube_urls = youtubeUrls.map((s) => s.trim()).filter(Boolean).slice(0, MAX_YOUTUBE_LINKS);
    for (const u of youtube_urls) {
      try { new URL(u); } catch { setError(`유튜브 URL 형식을 확인하세요: ${u}`); return; }
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      specialties,
      license: parsed.data.license?.trim() || null,
      youtube_urls,
      bio: parsed.data.bio || null,
      weekday_start: parsed.data.weekday_start || null,
      weekday_end: parsed.data.weekday_end || null,
      category_codes: categoryCodes,
    };
    const res = await adminFetch(
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
            {/* 노출 직역 + 편집 중인 값이 숨김 직역이면 그 값도 유지(기존 데이터 표시용) */}
            {(VERTICALS.includes(form.vertical) ? VERTICALS : [...VERTICALS, form.vertical]).map((v) => (
              <option key={v} value={v}>{VERTICAL_LABEL[v]} ({v})</option>
            ))}
          </select>
          <div className="col-span-2 flex items-center gap-3">
            {initial?.id ? (
              <label
                className="group relative cursor-pointer rounded-full"
                title="클릭하여 사진 변경"
                style={{ width: 56, height: 56, flexShrink: 0 }}
              >
                <ExpertAvatar expert={{ name: form.name || '?', photo_url: photoUrl }} size={56} />
                {/* 호버 오버레이: 클릭 가능 어포던스 */}
                <span
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ fontSize: 10, lineHeight: 1.1, gap: 2 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>변경</span>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            ) : (
              <div
                className="group relative rounded-full"
                title="전문가를 저장한 뒤 사진을 추가할 수 있어요"
                style={{ width: 56, height: 56, flexShrink: 0, cursor: 'not-allowed' }}
              >
                <ExpertAvatar expert={{ name: form.name || '?', photo_url: photoUrl }} size={56} />
                {/* 신규: 클릭 불가지만 사진 자리임을 호버로 안내 */}
                <span
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ fontSize: 9, lineHeight: 1.15, gap: 2, textAlign: 'center', padding: 2 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>저장 후<br />추가</span>
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-xs text-slate-500">
              {initial?.id ? (
                <span>아바타를 클릭하면 사진을 변경할 수 있어요 (jpg·png·webp, 최대 10MB · 자동 정사각 축소 저장)</span>
              ) : (
                <span>전문가를 먼저 저장한 뒤 사진을 업로드할 수 있습니다.</span>
              )}
              {uploading && <span className="text-emerald-600">업로드 중…</span>}
            </div>
          </div>
          <input className={`${field} col-span-2`} placeholder="자격 표시명 (예: 세무사 · 비우면 직업명)" value={form.license} onChange={(e) => set('license', e.target.value)} />
          <input className={field} placeholder="지역" value={form.region} onChange={(e) => set('region', e.target.value)} />
          <input className={field} placeholder="전화 (02-1234-5678)" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <input className={field} placeholder="경력(년)" value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
          <input className={field} placeholder="전문분야 · 필수 (형사|사기)" value={form.specialties} onChange={(e) => set('specialties', e.target.value)} />
          <div className="col-span-2">
            <div className="mb-1 text-xs text-slate-500">
              유튜브 링크 <span className="text-slate-400">(선택 · 최대 {MAX_YOUTUBE_LINKS}개)</span>
            </div>
            <div className="flex flex-col gap-2">
              {youtubeUrls.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={field}
                    placeholder="https://youtu.be/... 또는 https://www.youtube.com/watch?v=..."
                    value={u}
                    onChange={(e) => setYoutubeAt(i, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeYoutube(i)}
                    className="shrink-0 rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50"
                    title="링크 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {youtubeUrls.length < MAX_YOUTUBE_LINKS && (
                <button
                  type="button"
                  onClick={addYoutube}
                  className="self-start rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  + 링크 추가
                </button>
              )}
            </div>
          </div>
          <textarea className={`${field} col-span-2`} rows={2} placeholder="소개 (선택)" value={form.bio} onChange={(e) => set('bio', e.target.value)} />

          <div className="col-span-2">
            <div className="mb-1 text-xs text-slate-500">
              전문 카테고리 <span className="text-slate-400">({VERTICAL_LABEL[form.vertical]} · 필수 · 복수 선택, {categoryCodes.length}개)</span>
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
