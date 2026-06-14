import { ConsultStatus, Vertical } from './types';

// 3단계 상담 상태 표시 (배지 라벨)
export const STATUS_LABEL: Record<ConsultStatus, string> = {
  available:   '지금 통화 가능',
  delayed:     '15분 내 회신',
  unavailable: '상담 불가',
};

// 직역 라벨 = 문제 도메인. 세무는 세무사·회계사 두 자격을 포괄하므로 '세무·회계'
export const VERTICAL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사',
  doctor:    '의사',
  labor:     '노무사',
  patent:    '변리사',
  tax:       '세무·회계',
  adjuster:  '손해사정사',
  appraiser: '감정평가사',
};

export const VERTICAL_CALL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사에게 전화하기',
  doctor:    '의사에게 전화하기',
  labor:     '노무사에게 전화하기',
  patent:    '변리사에게 전화하기',
  tax:       '세무·회계 전문가에게 전화하기',
  adjuster:  '손해사정사에게 전화하기',
  appraiser: '감정평가사에게 전화하기',
};

// 카드·상세 표시용 직함: 개인 자격(license)이 있으면 우선, 없으면 직역 라벨
// (세무 도메인은 전문가마다 '세무사'/'회계사'가 달라 license 로 구분)
export function expertTitle(e: { vertical: Vertical; license?: string | null }): string {
  return e.license?.trim() || VERTICAL_LABEL[e.vertical];
}

export function expertCallLabel(e: { vertical: Vertical; license?: string | null }): string {
  const lic = e.license?.trim();
  return lic ? `${lic}에게 전화하기` : VERTICAL_CALL_LABEL[e.vertical];
}

// 카테고리 라벨을 칩 표시용으로 정리: 라우팅용 괄호 부연 제거
// 예) '저작권(등록·상담)' → '저작권', '민사·계약' → '민사·계약'(변화 없음)
export function categoryChipLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
