export type Vertical = 'lawyer' | 'labor' | 'adjuster' | 'tax' | 'doctor';
export type Urgency = '즉시' | '당일' | '일반';

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
  rating?: number;
  case_count?: number;
  is_available: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ClassifyResult {
  vertical: Vertical;
  category: string;
  urgency: Urgency;
  keywords: string[];
  summary: string;
  transcript?: string; // 음성 입력 시 Gemini 받아쓰기 결과. 텍스트 입력 시 undefined
}
