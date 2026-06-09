import { supabaseAdmin } from '@/lib/supabase';
import type { Expert, Urgency, Vertical } from '@/lib/types';
import type { ExpertRepository } from './repository';

const SELECT = 'id,name,vertical,specialties,region,phone,experience_years,bio,youtube_url,status,weekday_start,weekday_end,weekend_available,night_available,is_active,created_at';

function shuffleExperts(experts: Expert[]): Expert[] {
  const shuffled = [...experts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const supabaseExpertRepository: ExpertRepository = {
  async listRecommended({ vertical, urgency, categoryCode }: {
    vertical: Vertical; urgency?: Urgency | string | null; categoryCode?: string | null;
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

    return shuffleExperts(experts).slice(0, 3);
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
};
