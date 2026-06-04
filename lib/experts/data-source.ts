export type ExpertDataSource = 'mock' | 'supabase';

export function getExpertDataSource(): ExpertDataSource {
  return process.env.GOLGORU_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';
}
