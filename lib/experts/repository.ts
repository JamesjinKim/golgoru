import type { Expert, Urgency, Vertical } from '@/lib/types';
import { getExpertDataSource } from './data-source';
import { mockExpertRepository } from './mock-repository';
import { supabaseExpertRepository } from './supabase-repository';

export interface ExpertRepository {
  listRecommended(input: {
    vertical: Vertical;
    urgency?: Urgency | string | null;
    categoryCode?: string | null;
  }): Promise<Expert[]>;
  findById(id: string): Promise<Expert | null>;
}

export function getExpertRepository(): ExpertRepository {
  return getExpertDataSource() === 'supabase'
    ? supabaseExpertRepository
    : mockExpertRepository;
}
