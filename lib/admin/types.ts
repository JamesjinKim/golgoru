import { ConsultStatus, Vertical } from '@/lib/types';

export type AdminRole = 'super_admin' | 'operator';

export interface AdminIdentity {
  userId: string;
  email: string;
  role: AdminRole;
}

export interface ExpertInput {
  name: string;
  vertical: Vertical;
  specialties: string[];
  region: string;
  phone: string;
  experience_years: number;
  bio?: string;
  youtube_url?: string;
  status: ConsultStatus;
  weekday_start?: string | null;
  weekday_end?: string | null;
  weekend_available: boolean;
  night_available: boolean;
  is_active: boolean;
}

export type AuditAction =
  | 'expert.create'
  | 'expert.update'
  | 'expert.deactivate'
  | 'expert.delete'
  | 'expert.import'
  | 'auth.login.success'
  | 'auth.login.fail';
