import type { Category, Expert, Urgency, Vertical } from '@/lib/types';
import { getExpertDataSource } from './data-source';
import { mockExpertRepository } from './mock-repository';
import { supabaseExpertRepository } from './supabase-repository';

// 둘러보기(미니홈피 디렉터리) 페이지당 항목 수
export const BROWSE_PAGE_SIZE = 20;

export interface BrowsePage {
  experts: Expert[];
  nextCursor: string | null; // null = 더 없음
}

export interface ExpertRepository {
  listRecommended(input: {
    vertical: Vertical;
    urgency?: Urgency | string | null;
    categoryCode?: string | null;
    region?: string | null; // 사용자 광역(시/도). 지역 우선 추천용
  }): Promise<Expert[]>;
  // 둘러보기: 커서 기반 페이지네이션. 정렬은 중립 키(상담가능 우선 → 가나다 → id)
  listBrowse(input: {
    vertical?: Vertical | null;
    categoryCode?: string | null;
    cursor?: string | null;
    limit?: number;
  }): Promise<BrowsePage>;
  findById(id: string): Promise<Expert | null>;
  // 미니홈피 '전문 분야' 표시용 — 전문가가 등록한 카테고리(level-1, 라벨 포함). 없으면 []
  findCategoriesByExpertId(id: string): Promise<Category[]>;
}

export function getExpertRepository(): ExpertRepository {
  return getExpertDataSource() === 'supabase'
    ? supabaseExpertRepository
    : mockExpertRepository;
}
