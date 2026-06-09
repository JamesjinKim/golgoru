export type Vertical =
  | 'lawyer'    // 변호사
  | 'doctor'    // 의사
  | 'labor'     // 노무사
  | 'patent'    // 변리사
  | 'tax'       // 세무사
  | 'adjuster'  // 손해사정사
  | 'appraiser'; // 감정평가사
export type Urgency = '즉시' | '당일' | '일반';

// 3단계 상담 상태 (experts-schema.design.md D3)
export type ConsultStatus = 'available' | 'delayed' | 'unavailable';

export interface Expert {
  id: string;
  name: string;
  vertical: Vertical;
  specialties: string[];
  region: string;
  phone: string;
  experience_years: number;
  bio?: string;
  youtube_url?: string;
  status: ConsultStatus;
  weekday_start?: string | null; // HH:mm[:ss]
  weekday_end?: string | null;
  weekend_available: boolean;
  night_available: boolean;
  is_active: boolean;
  created_at: string;
  category_codes?: string[]; // 어드민 조회 시 expert_categories 조인 결과 (표시·편집용)
}

// ── 핵심 루프 엔티티 (supabase-schema-v2.sql) ────────────────────────
export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ConsultRequest {
  id: string;
  expert_id: string;
  session_id: string;
  user_id?: string | null;
  query: string;
  vertical: Vertical;
  urgency?: Urgency | null;
  status: RequestStatus;
  expert_reply?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  expert_id: string;
  session_id: string;
  created_at: string;
}

export interface ClassifyResult {
  vertical: Vertical;
  category: string;
  category_code?: string; // 정규화 카테고리 코드 (예: 'LAW-03'). 매칭 우선, 없으면 vertical 폴백
  urgency: Urgency;
  keywords: string[];
  summary: string;
  transcript?: string; // 음성 입력 시 Gemini 받아쓰기 결과. 텍스트 입력 시 undefined
}

// 정규화 카테고리 (experts-taxonomy.design.md)
export interface Category {
  code: string;          // 'LAW-01' / 'LAW-01-01'
  parent_code?: string | null;
  vertical: Vertical;
  level: number;         // 1 중분류 / 2 세부
  label: string;
  is_active: boolean;
}

export interface ExpertCategory {
  expert_id: string;
  category_code: string;
}
