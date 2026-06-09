import { MOCK_EXPERTS } from '@/lib/mock-data';
import type { Expert, Urgency, Vertical } from '@/lib/types';
import type { ExpertRepository } from './repository';

function shuffleExperts(experts: Expert[]): Expert[] {
  const shuffled = [...experts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const mockExpertRepository: ExpertRepository = {
  // mock 데이터는 카테고리 코드 태깅이 없어 categoryCode 는 무시하고 vertical 매칭만 수행
  async listRecommended({ vertical, urgency }: {
    vertical: Vertical; urgency?: Urgency | string | null; categoryCode?: string | null;
  }) {
    let experts = MOCK_EXPERTS.filter((expert) => expert.vertical === vertical && expert.is_active);

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.status === 'available');
      if (available.length > 0) {
        experts = available;
      }
    }

    return shuffleExperts(experts).slice(0, 3);
  },

  async findById(id: string) {
    return MOCK_EXPERTS.find((expert) => expert.id === id) ?? null;
  },
};
