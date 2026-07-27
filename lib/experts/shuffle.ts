import type { ConsultStatus } from '@/lib/types';

// 상담 상태 우선순위(작을수록 위): 지금 통화가능 → 회신 → 불가. 셔플해도 이 그룹 순서는 유지한다.
export const STATUS_ORDER: Record<ConsultStatus, number> = {
  available: 0,
  delayed: 1,
  unavailable: 2,
};

// 결정론적 해시: (id, seed) → 32bit 정수. 같은 입력이면 항상 같은 값이라
// 같은 seed 안에서는 순서가 안정적(페이지네이션 더보기와 호환). seed가 다르면 순서가 달라진다.
// FNV-1a 변형 + seed 믹싱.
export function seededRank(id: string, seed: number): number {
  let h = (2166136261 ^ (seed | 0)) >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // 추가 믹싱(avalanche)
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

// status 우선(그룹 유지) + 같은 status 안에서 seed 기반 랜덤 순서로 정렬.
// 원본 배열은 건드리지 않는다.
export function sortByStatusThenSeed<T extends { status: ConsultStatus; id: string }>(
  experts: T[],
  seed: number,
): T[] {
  return [...experts].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
      (seededRank(a.id, seed) - seededRank(b.id, seed)) ||
      a.id.localeCompare(b.id), // 해시 충돌 시 안정적 tiebreak
  );
}

// 랜덤 seed 생성(클라이언트). 매 페이지 로드마다 새로 만들어 순서를 바꾼다.
export function makeSeed(): number {
  return Math.floor(Math.random() * 2147483647) + 1;
}
