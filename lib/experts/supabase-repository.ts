import { supabaseAdmin } from '@/lib/supabase';
import type { Expert, Urgency, Vertical } from '@/lib/types';
import type { ExpertRepository } from './repository';

const SELECT = 'id,name,vertical,specialties,region,phone,experience_years,bio,youtube_url,is_available,is_active,created_at';

function shuffleExperts(experts: Expert[]): Expert[] {
  const shuffled = [...experts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const supabaseExpertRepository: ExpertRepository = {
  async listRecommended({ vertical, urgency }: { vertical: Vertical; urgency?: Urgency | string | null }) {
    let query = supabaseAdmin
      .from('experts')
      .select(SELECT)
      .eq('vertical', vertical)
      .eq('is_active', true);

    if (urgency === '즉시') {
      query = query.order('is_available', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('[experts] supabase list error:', error);
      return [];
    }

    let experts = (data ?? []) as Expert[];

    if (urgency === '즉시') {
      const available = experts.filter((expert) => expert.is_available);
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

    return data as Expert;
  },
};
