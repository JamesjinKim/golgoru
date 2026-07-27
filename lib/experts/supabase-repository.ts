import { supabaseAdmin } from '@/lib/supabase';
import type { Category, Expert, Urgency, Vertical } from '@/lib/types';
import { BROWSE_PAGE_SIZE, type ExpertRepository } from './repository';
import { pickRecommended } from './select';
import { sortByStatusThenSeed, STATUS_ORDER } from './shuffle';

const SELECT = 'id,name,vertical,license,specialties,region,phone,experience_years,bio,youtube_url,youtube_urls,status,weekday_start,weekday_end,weekend_available,night_available,is_active,created_at,photo_url';

// 둘러보기 커서: offset 기반(opaque base64). seed 셔플 순서는 SQL로 재현 불가하므로,
// 필터된 전체를 조회해 앱에서 정렬 후 offset 슬라이스한다(규모가 작아 부담 없음).
function encodeOffset(n: number): string {
  return Buffer.from(String(n)).toString('base64url');
}
function decodeOffset(raw: string): number {
  try {
    const n = Number(Buffer.from(raw, 'base64url').toString('utf8'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export const supabaseExpertRepository: ExpertRepository = {
  async listRecommended({ vertical, urgency, categoryCode, region }: {
    vertical: Vertical; urgency?: Urgency | string | null; categoryCode?: string | null; region?: string | null;
  }) {
    // 카테고리 코드 우선: 해당 코드를 보유한 전문가 id 수집 (없으면 vertical 폴백)
    let categoryIds: string[] | null = null;
    if (categoryCode) {
      const { data: tagged } = await supabaseAdmin
        .from('expert_categories')
        .select('expert_id')
        .eq('category_code', categoryCode);
      categoryIds = (tagged ?? []).map((t: { expert_id: string }) => t.expert_id);
    }

    let query = supabaseAdmin
      .from('experts')
      .select(SELECT)
      .eq('vertical', vertical)
      .eq('is_active', true);

    // 코드 매칭 전문가가 1명 이상일 때만 좁힘 → 0명이면 자동으로 vertical 폴백
    if (categoryIds && categoryIds.length > 0) {
      query = query.in('id', categoryIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[experts] supabase list error:', error);
      return [];
    }

    let experts = (data ?? []) as unknown as Expert[];

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.status === 'available');
      if (available.length > 0) {
        experts = available;
      }
    }

    // 사용자 광역 우선 → 부족하면 인접 광역 → 그래도 부족하면 전 지역에서 3인 선정
    return pickRecommended(experts, region);
  },

  async listBrowse({ vertical, categoryCode, cursor, limit = BROWSE_PAGE_SIZE, seed }) {
    // 카테고리 필터: 해당 코드를 보유한 전문가 id 수집 (0명이면 빈 결과)
    let categoryIds: string[] | null = null;
    if (categoryCode) {
      const { data: tagged } = await supabaseAdmin
        .from('expert_categories')
        .select('expert_id')
        .eq('category_code', categoryCode);
      categoryIds = (tagged ?? []).map((t: { expert_id: string }) => t.expert_id);
      if (categoryIds.length === 0) return { experts: [], nextCursor: null };
    }

    // 필터된 전체를 조회 → 앱에서 정렬 → offset 슬라이스.
    // seed 있으면 상담가능(status) 우선 + 그 안에서 랜덤 셔플, 없으면 기존 가나다순 폴백.
    let query = supabaseAdmin.from('experts').select(SELECT).eq('is_active', true);
    if (vertical) query = query.eq('vertical', vertical);
    if (categoryIds) query = query.in('id', categoryIds);

    const { data, error } = await query;
    if (error) {
      console.error('[experts] supabase browse error:', error);
      return { experts: [], nextCursor: null };
    }

    const all = (data ?? []) as unknown as Expert[];
    const sorted = seed !== undefined
      ? sortByStatusThenSeed(all, seed)
      : [...all].sort(
          (a, b) =>
            (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
            a.name.localeCompare(b.name, 'ko') ||
            a.id.localeCompare(b.id),
        );

    const offset = cursor ? decodeOffset(cursor) : 0;
    const experts = sorted.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const nextCursor = nextOffset < sorted.length ? encodeOffset(nextOffset) : null;
    return { experts, nextCursor };
  },

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('experts')
      .select(SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as Expert;
  },

  // 미니홈피 표시용: 전문가 등록 카테고리(level-1, 라벨 포함). 추천 매칭과 동일한 소스
  async findCategoriesByExpertId(id: string) {
    const { data: tags } = await supabaseAdmin
      .from('expert_categories')
      .select('category_code')
      .eq('expert_id', id);
    const codes = (tags ?? []).map((t: { category_code: string }) => t.category_code);
    if (codes.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('code,parent_code,vertical,level,label,is_active')
      .in('code', codes)
      .eq('is_active', true)
      .eq('level', 1)
      .order('code', { ascending: true });

    if (error) {
      console.error('[experts] supabase categories error:', error);
      return [];
    }
    return (data ?? []) as Category[];
  },
};
