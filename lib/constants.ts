import { ConsultStatus, Vertical } from './types';

// 3단계 상담 상태 표시 (배지 라벨)
export const STATUS_LABEL: Record<ConsultStatus, string> = {
  available:   '지금 통화 가능',
  delayed:     '15분 내 회신',
  unavailable: '상담 불가',
};

export const VERTICAL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사',
  doctor:    '의사',
  labor:     '노무사',
  patent:    '변리사',
  tax:       '세무사',
  adjuster:  '손해사정사',
  appraiser: '감정평가사',
};

export const VERTICAL_CALL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사에게 전화하기',
  doctor:    '의사에게 전화하기',
  labor:     '노무사에게 전화하기',
  patent:    '변리사에게 전화하기',
  tax:       '세무사에게 전화하기',
  adjuster:  '손해사정사에게 전화하기',
  appraiser: '감정평가사에게 전화하기',
};
