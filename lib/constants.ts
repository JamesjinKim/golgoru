import type { ConsultStatus, Vertical } from './types';

// 3단계 상담 상태 표시 (배지 라벨)
export const STATUS_LABEL: Record<ConsultStatus, string> = {
  available:   '지금 통화 가능',
  delayed:     '다른 분 상담 후 회신',
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
// doctor(병원): 런칭 준비 부족으로 오픈 보류 — UI·검색 노출 차단(DB 데이터는 보존). 오픈 시 제거.
export const HIDDEN_VERTICALS: readonly Vertical[] = ['appraiser', 'doctor'];

// 전체 버티컬 (라벨 정의 순서). 순서가 필요한 UI 목록은 VISIBLE_VERTICALS를 쓸 것.
export const ALL_VERTICALS = Object.keys(VERTICAL_LABEL) as Vertical[];

// 직역 노출 순서 SSoT (골고루팀 지정): 변호사→노무사→세무사→변리사→손해사정사→병원.
// 소비자 /experts 칩, 어드민 목록/드롭다운, 어드민 전문가 정렬이 모두 이 순서를 공유한다.
// 라벨 정의 순서(ALL_VERTICALS)와 다르므로 별도 지정. 여기 없는 직역(appraiser 등)은 맨 뒤로.
export const VERTICAL_DISPLAY_ORDER: Vertical[] = [
  'lawyer', 'labor', 'tax', 'patent', 'adjuster', 'doctor',
];

// UI 노출용 버티컬 목록: 지정 순서 + 숨김 대상 제외. (순서에 없는 노출 직역이 생기면 뒤에 덧붙임)
export const VISIBLE_VERTICALS: Vertical[] = [
  ...VERTICAL_DISPLAY_ORDER,
  ...ALL_VERTICALS.filter((v) => !VERTICAL_DISPLAY_ORDER.includes(v)),
].filter((v) => !HIDDEN_VERTICALS.includes(v));

export const isHiddenVertical = (v: Vertical): boolean => HIDDEN_VERTICALS.includes(v);

// 어드민 전문가 목록 그룹 정렬 우선순위. 지정 순서를 따르며, 없으면 큰 값(뒤로).
export function adminVerticalRank(v: Vertical): number {
  const i = VERTICAL_DISPLAY_ORDER.indexOf(v);
  return i === -1 ? VERTICAL_DISPLAY_ORDER.length : i;
}

// license 표시 정규화: 세무사 요청으로 '회계' 표기를 노출하지 않는다.
// 예) '김세무 세무회계' → '김세무 세무', '세무회계' → '세무'. DB 값은 그대로, 표시만 정리.
// '회계' 제거 후 남은 공백·구분자를 다듬고, 비면 null 취급(라벨로 폴백).
export function displayLicense(license?: string | null): string | null {
  const raw = license?.trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/회계/g, '')
    .replace(/\s{2,}/g, ' ')       // 중간 이중 공백 정리
    .replace(/[·・]\s*$/, '')       // 끝에 남은 구분점 제거
    .trim();
  return cleaned || null;
}

// 카드·상세 표시용 직함: 개인 자격(license)이 있으면 우선, 없으면 직역 라벨
export function expertTitle(e: { vertical: Vertical; license?: string | null }): string {
  return displayLicense(e.license) || VERTICAL_LABEL[e.vertical];
}

export function expertCallLabel(e: { vertical: Vertical; license?: string | null }): string {
  const lic = displayLicense(e.license);
  return lic ? `${lic}에게 전화하기` : VERTICAL_CALL_LABEL[e.vertical];
}

// 카테고리 라벨을 칩 표시용으로 정리: 라우팅용 괄호 부연 제거
// 예) '저작권(등록·상담)' → '저작권', '민사·계약' → '민사·계약'(변화 없음)
export function categoryChipLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
