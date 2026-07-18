import type { ConsultStatus, Vertical } from '@/lib/types';

export type AdminRole = 'super_admin' | 'operator';

export interface AdminIdentity {
  userId: string;
  email: string;
  role: AdminRole;
}

export interface ExpertInput {
  name: string;
  vertical: Vertical;
  license?: string | null; // 표시용 자격명(세무사 등). 비면 직역 라벨
  specialties: string[];
  region: string;
  phone: string;
  experience_years: number;
  bio?: string;
  youtube_urls?: string[]; // 멀티 유튜브 링크(최대 3)
  status: ConsultStatus;
  weekday_start?: string | null;
  weekday_end?: string | null;
  weekend_available: boolean;
  night_available: boolean;
  category_codes: string[]; // CSV 선택 컬럼 (빈 값이면 [])
  is_active: boolean;
}

export type AuditAction =
  | 'expert.create'
  | 'expert.update'
  | 'expert.deactivate'
  | 'expert.delete'
  | 'expert.import'
  | 'category.create'
  | 'category.update'
  | 'application.update'
  | 'auth.login.success'
  | 'auth.login.fail';

// 전문가 입점신청 처리 상태
export type ExpertApplicationStatus = 'new' | 'contacted' | 'done';

export interface ExpertApplication {
  id: string;
  name: string;                 // 성명 또는 업체명
  phone: string;                // 연락처
  vertical: Vertical | null;    // 희망 전문분야(직역 코드)
  message: string | null;       // 문의 내용
  status: ExpertApplicationStatus;
  created_at: string;
}
