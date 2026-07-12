import type { Expert } from '@/lib/types';
import { canonicalRegionKey, getAdjacentRegions } from '@/lib/regions';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 지역 우선 추천 선정: 사용자 광역(region) 내 전문가로 limit(기본 3)명을 우선 채우고,
// 부족하면 인접 광역에서 가까운 순으로 채운다. 그래도 부족하거나 region 이 없으면
// 전 지역에서 무작위로 채운다. 같은 티어 내에서는 무작위(재추천 시 다른 3인).
export function pickRecommended(
  experts: Expert[],
  region?: string | null,
  limit = 3,
): Expert[] {
  const key = canonicalRegionKey(region);
  const result: Expert[] = [];
  const used = new Set<string>();

  const take = (pool: Expert[]) => {
    for (const e of shuffle(pool)) {
      if (result.length >= limit) break;
      if (used.has(e.id)) continue;
      result.push(e);
      used.add(e.id);
    }
  };

  if (key) {
    // 1티어: 같은 광역
    take(experts.filter((e) => canonicalRegionKey(e.region) === key));
    // 2티어~: 인접 광역 (가까운 순으로 하나씩)
    for (const adj of getAdjacentRegions(key)) {
      if (result.length >= limit) break;
      take(experts.filter((e) => canonicalRegionKey(e.region) === adj));
    }
  }

  // 최종 폴백: region 미상이거나 인접까지도 부족하면 전 지역에서 채움
  if (result.length < limit) take(experts);

  return result;
}
