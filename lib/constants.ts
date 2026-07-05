import type { ConsultStatus, Vertical } from './types';

// 3단계 상담 상태 표시 (배지 라벨)
export const STATUS_LABEL: Record<ConsultStatus, string> = {
  available:   '지금 통화 가능',
  delayed:     '15분 내 회신',
  unavailable: '상담 불가',
};

// 직역 라벨 = 문제 도메인. 세무 영역은 세무사로 단일화한다.
export const VERTICAL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사',
  doctor:    '병원',
  labor:     '노무사',
  patent:    '변리사',
  tax:       '세무사',
  adjuster:  '손해사정사',
  appraiser: '감정평가사',
};

export const VERTICAL_CALL_LABEL: Record<Vertical, string> = {
  lawyer:    '변호사에게 전화하기',
  doctor:    '병원에 전화하기',
  labor:     '노무사에게 전화하기',
  patent:    '변리사에게 전화하기',
  tax:       '세무사에게 전화하기',
  adjuster:  '손해사정사에게 전화하기',
  appraiser: '감정평가사에게 전화하기',
};

// UI에서 숨길 버티컬 (영업팀 요청). DB 데이터·타입·라벨은 보존하고 노출만 차단한다.
// 다시 노출하려면 이 배열에서 제거하면 된다.
export const HIDDEN_VERTICALS: readonly Vertical[] = ['appraiser'];

// 전체 버티컬 순서 (라벨 정의 순서 = 노출 순서). UI 목록은 VISIBLE_VERTICALS를 쓸 것.
export const ALL_VERTICALS = Object.keys(VERTICAL_LABEL) as Vertical[];

// UI 노출용 버티컬 목록: 숨김 대상을 제외한다.
export const VISIBLE_VERTICALS: Vertical[] = ALL_VERTICALS.filter(
  (v) => !HIDDEN_VERTICALS.includes(v),
);

export const isHiddenVertical = (v: Vertical): boolean => HIDDEN_VERTICALS.includes(v);

// 카드·상세 표시용 직함: 개인 자격(license)이 있으면 우선, 없으면 직역 라벨
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
