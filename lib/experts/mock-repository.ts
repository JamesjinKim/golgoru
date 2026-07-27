import { MOCK_EXPERTS } from '@/lib/mock-data';
import type { Expert, Urgency, Vertical } from '@/lib/types';
import { BROWSE_PAGE_SIZE, type ExpertRepository } from './repository';
import { pickRecommended } from './select';
import { sortByStatusThenSeed, STATUS_ORDER } from './shuffle';

// mock 은 단순 오프셋 커서 (supabase 도 offset 방식으로 통일. 클라이언트엔 opaque)
function encodeOffset(o: number): string {
  return Buffer.from(String(o)).toString('base64url');
}
function decodeOffset(raw: string): number {
  const n = Number(Buffer.from(raw, 'base64url').toString('utf8'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const mockExpertRepository: ExpertRepository = {
  // mock 데이터는 카테고리 코드 태깅이 없어 categoryCode 는 무시하고 vertical 매칭만 수행
  async listRecommended({ vertical, urgency, region }: {
    vertical: Vertical; urgency?: Urgency | string | null; categoryCode?: string | null; region?: string | null;
  }) {
    let experts = MOCK_EXPERTS.filter((expert) => expert.vertical === vertical && expert.is_active);

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.status === 'available');
      if (available.length > 0) {
        experts = available;
      }
    }

    // 사용자 광역 우선 → 부족하면 인접 광역 → 그래도 부족하면 전 지역에서 3인 선정
    return pickRecommended(experts, region);
  },

  // mock 데이터는 카테고리 태깅이 없어 categoryCode 는 무시하고 vertical 필터만 적용
  async listBrowse({ vertical, cursor, limit = BROWSE_PAGE_SIZE, seed }) {
    let experts = MOCK_EXPERTS.filter((e) => e.is_active);
    if (vertical) experts = experts.filter((e) => e.vertical === vertical);

    // seed 있으면 상담가능 우선 + 랜덤 셔플, 없으면 가나다순 폴백
    experts = seed !== undefined
      ? sortByStatusThenSeed(experts, seed)
      : [...experts].sort((a, b) =>
          (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
          a.name.localeCompare(b.name, 'ko') ||
          a.id.localeCompare(b.id)
        );

    const offset = cursor ? decodeOffset(cursor) : 0;
    const page = experts.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < experts.length ? encodeOffset(nextOffset) : null;
    return { experts: page, nextCursor };
  },

  async findById(id: string) {
    return MOCK_EXPERTS.find((expert) => expert.id === id) ?? null;
  },

  // mock 데이터는 카테고리 태깅이 없음 → 빈 배열. 미니홈피는 specialties 폴백 표시
  async findCategoriesByExpertId() {
    return [];
  },
};
