'use client';
import { useEffect, useState } from 'react';

interface Log {
  id: string; actor_email: string | null; action: string;
  target_table: string | null; target_id: string | null;
  detail: unknown; created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-slate-900">감사 · 접속 로그</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">시각</th>
              <th className="px-3 py-2 font-medium">행위</th>
              <th className="px-3 py-2 font-medium">주체</th>
              <th className="px-3 py-2 font-medium">대상</th>
              <th className="px-3 py-2 font-medium">상세</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-slate-400">불러오는 중…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-slate-400">로그 없음</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                  {new Date(l.created_at).toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{l.action}</span></td>
                <td className="px-3 py-2">{l.actor_email ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{l.target_table ? `${l.target_table}:${l.target_id ?? ''}` : '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{l.detail ? JSON.stringify(l.detail) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
