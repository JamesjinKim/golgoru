'use client';
import { useState } from 'react';
import { z } from 'zod';
import { Expert, Vertical } from '@/lib/types';

const VERTICALS: Vertical[] = ['lawyer', 'labor', 'adjuster', 'tax', 'doctor'];

const schema = z.object({
  name: z.string().trim().min(1, '이름 필수').max(50),
  vertical: z.enum(['lawyer', 'labor', 'adjuster', 'tax', 'doctor']),
  specialties: z.string(),
  region: z.string().trim().min(1, '지역 필수').max(50),
  phone: z.string().trim().regex(/^[0-9-]{7,20}$/, '전화 형식(숫자·하이픈 7~20)'),
  experience_years: z.coerce.number().int().min(0).max(80),
  bio: z.string().max(300).optional(),
  youtube_url: z.string().url('URL 형식').or(z.literal('')).optional(),
  is_available: z.boolean(),
  is_active: z.boolean(),
});

export function ExpertForm({
  initial, onClose, onSaved,
}: { initial?: Expert; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    vertical: (initial?.vertical ?? 'lawyer') as Vertical,
    specialties: (initial?.specialties ?? []).join('|'),
    region: initial?.region ?? '',
    phone: initial?.phone ?? '',
    experience_years: String(initial?.experience_years ?? 0),
    bio: initial?.bio ?? '',
    youtube_url: initial?.youtube_url ?? '',
    is_available: initial?.is_available ?? true,
    is_active: initial?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    const payload = {
      ...parsed.data,
      specialties: parsed.data.specialties.split('|').map((s) => s.trim()).filter(Boolean),
      youtube_url: parsed.data.youtube_url || null,
      bio: parsed.data.bio || null,
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
          <select className={field} value={form.vertical} onChange={(e) => set('vertical', e.target.value)}>
            {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input className={field} placeholder="지역" value={form.region} onChange={(e) => set('region', e.target.value)} />
          <input className={field} placeholder="전화 (02-1234-5678)" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <input className={field} placeholder="경력(년)" value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
          <input className={field} placeholder="전문분야 (형사|사기)" value={form.specialties} onChange={(e) => set('specialties', e.target.value)} />
          <input className={`${field} col-span-2`} placeholder="유튜브 URL (선택)" value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} />
          <textarea className={`${field} col-span-2`} rows={2} placeholder="소개 (선택)" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.is_available} onChange={(e) => set('is_available', e.target.checked)} /> 통화가능
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
