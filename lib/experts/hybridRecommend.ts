import type { Expert } from '@/lib/types';

/**
 * 주 직역과 보조 직역(secondary_vertical)의 추천 결과를 3인 목록으로 조화롭게 믹스합니다.
 * - 기본: 주 직역 2인 + 보조 직역 1인
 * - 주 직역 1인인 경우: 주 직역 1인 + 보조 직역 2인
 * - 한쪽 풀이 빈 경우: 다른 쪽 풀에서 최대 3인 채움
 */
export function mixRecommendedExperts(primary: Expert[], secondary: Expert[] = []): Expert[] {
  if (secondary.length === 0) return primary.slice(0, 3);
  if (primary.length === 0) return secondary.slice(0, 3);

  const seenIds = new Set<string>();
  const result: Expert[] = [];

  const add = (e: Expert) => {
    if (!seenIds.has(e.id) && result.length < 3) {
      seenIds.add(e.id);
      result.push(e);
    }
  };

  // 주 직역 상위 최대 2인 추가
  const pCount = Math.min(primary.length, 2);
  for (let i = 0; i < pCount; i++) {
    add(primary[i]);
  }

  // 보조 직역 상위 추가
  for (const s of secondary) {
    add(s);
  }

  // 아직 3인이 안 찼으면 남은 주 직역에서 추가
  for (const p of primary) {
    add(p);
  }

  return result;
}
