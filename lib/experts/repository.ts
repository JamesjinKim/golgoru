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
  // 둘러보기: 커서 기반 페이지네이션. 상담가능(status) 우선 + seed 있으면 그 안에서 랜덤 셔플
  // (성씨 노출 불공정 해소), seed 없으면 가나다순 폴백.
  listBrowse(input: {
    vertical?: Vertical | null;
    categoryCode?: string | null;
    cursor?: string | null;
    limit?: number;
    seed?: number; // 세션 랜덤 seed. 같은 seed면 같은 순서(더보기 일관성)
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
