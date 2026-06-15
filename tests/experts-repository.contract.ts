import { getExpertDataSource } from '@/lib/experts/data-source';
import { getExpertRepository, type ExpertRepository } from '@/lib/experts/repository';
import type { Expert } from '@/lib/types';

const dataSource: 'mock' | 'supabase' = getExpertDataSource();
const repository: ExpertRepository = getExpertRepository();

async function verifyRepositoryContract() {
  const recommended: Expert[] = await repository.listRecommended({
    vertical: 'lawyer',
    urgency: '즉시',
  });
  const detail: Expert | null = await repository.findById('lawyer-1');

  return { dataSource, recommended, detail };
}

void verifyRepositoryContract;
