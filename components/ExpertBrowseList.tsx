'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Expert, Vertical } from '@/lib/types';
import ExpertCard from './ExpertCard';
import { makeSeed } from '@/lib/experts/shuffle';
import { G } from '@/lib/tokens';

export default function ExpertBrowseList({
  initialExperts,
  initialCursor,
  vertical,
  category,
  backHref,
}: {
  initialExperts: Expert[];
  initialCursor: string | null;
  vertical: Vertical | null;
  category: string | null;
  backHref: string;
  // 전화번호 노출 여부. 실제 잠금은 카드가 phone 유무로 판단(더보기 API도 서버에서 phone 제거)하므로
  // 이 값을 직접 쓰진 않지만, 초기분/추가분 노출 정책이 일치함을 명시하기 위해 받는다.
  signedIn?: boolean;
}) {
  // 필터가 바뀌면 부모 페이지에서 key 로 remount → 아래 초기값으로 상태 리셋
  const [experts, setExperts] = useState<Expert[]>(initialExperts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // 세션 랜덤 seed: 마운트 시 1회 생성(공정 셔플). 하이드레이션 안전을 위해 effect에서 세팅.
  const seedRef = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (vertical) params.set('vertical', vertical);
    if (category) params.set('category', category);
    if (seedRef.current != null) params.set('seed', String(seedRef.current));
    for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
    return params;
  }, [vertical, category]);

  // 마운트 직후: 랜덤 seed로 첫 페이지를 다시 로드해 셔플된 순서로 교체.
  // SSR 초기분(가나다순)은 잠깐 보였다가 즉시 셔플 결과로 대체된다.
  useEffect(() => {
    seedRef.current = makeSeed();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/experts/browse?${buildParams().toString()}`);
        if (!res.ok) return;
        const data: { experts?: Expert[]; nextCursor?: string | null } = await res.json();
        if (cancelled) return;
        setExperts(data.experts ?? []);
        setCursor(data.nextCursor ?? null);
      } catch {
        /* 실패 시 SSR 초기분(가나다순) 유지 */
      }
    })();
    return () => { cancelled = true; };
    // 마운트당 1회(필터 변경은 key remount로 처리됨)
  }, [buildParams]);

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
