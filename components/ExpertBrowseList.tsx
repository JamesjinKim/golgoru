'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Expert, Vertical } from '@/lib/types';
import ExpertCard from './ExpertCard';
import { G } from '@/lib/tokens';

export default function ExpertBrowseList({
  initialExperts,
  initialCursor,
  vertical,
  category,
  backHref,
  seed,
}: {
  initialExperts: Expert[];
  initialCursor: string | null;
  vertical: Vertical | null;
  category: string | null;
  backHref: string;
  // 전화번호 노출 여부. 실제 잠금은 카드가 phone 유무로 판단(더보기 API도 서버에서 phone 제거)하므로
  // 이 값을 직접 쓰진 않지만, 초기분/추가분 노출 정책이 일치함을 명시하기 위해 받는다.
  signedIn?: boolean;
  // 서버가 생성한 셔플 seed. 초기 목록은 이미 이 seed로 서버에서 셔플돼 옴(깜빡임 없음).
  // '더 보기'가 같은 seed를 이어써 순서 일관성을 유지한다.
  seed?: number;
}) {
  // 필터가 바뀌면 부모 페이지에서 key 로 remount → 아래 초기값으로 상태 리셋.
  // 초기 목록(initialExperts)은 서버에서 이미 셔플된 상태 → 클라 재로드 없이 그대로 표시(깜빡임 없음).
  const [experts, setExperts] = useState<Expert[]>(initialExperts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (vertical) params.set('vertical', vertical);
    if (category) params.set('category', category);
    if (seed != null) params.set('seed', String(seed));
    for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
    return params;
  }, [vertical, category, seed]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/experts/browse?${buildParams({ cursor }).toString()}`);
      if (!res.ok) throw new Error('load failed');
      const data: { experts?: Expert[]; nextCursor?: string | null } = await res.json();
      setExperts((prev) => [...prev, ...(data.experts ?? [])]);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loading, cursor, buildParams]);

  // 하단 sentinel 이 뷰포트 근처(200px)에 들어오면 다음 페이지 append
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  if (experts.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '64px 20px', color: G.textSoft,
        fontSize: 14, letterSpacing: '-0.16px',
      }}>
        조건에 맞는 전문가가 아직 없어요.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {experts.map((expert) => (
          <ExpertCard
            key={expert.id}
            expert={expert}
            href={`/expert/${expert.id}?back=${encodeURIComponent(backHref)}`}
          />
        ))}
      </div>

      {/* 무한 스크롤 감지 지점 + 상태 표시 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      <div style={{ textAlign: 'center', padding: '20px 0 8px', color: G.textSoft, fontSize: 13, letterSpacing: '-0.16px' }}>
        {loading && '불러오는 중…'}
        {!loading && error && (
          <button
            onClick={loadMore}
            style={{
              background: '#fff', border: `1px solid ${G.hairline}`, borderRadius: 50,
              padding: '8px 18px', fontSize: 13, fontWeight: 700, color: G.greenAccent,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.16px',
            }}
          >
            다시 시도
          </button>
        )}
        {!loading && !error && !cursor && '마지막입니다'}
      </div>
    </div>
  );
}
