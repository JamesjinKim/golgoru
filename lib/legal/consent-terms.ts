// 동의 화면(/consent) 4개 항목의 약관 전문 — 표시용 SSoT.
// 항목별 페이지 app/(site)/terms/[key]/page.tsx 가 이 데이터를 렌더한다.
//
// ⚠️ 본 문구는 서비스 준비 중 초안이며 법률 자문이 아니다. 런칭 전 개인정보 전문
//    변호사 검토가 필요하다. privacy/thirdparty/marketing 은
//    docs/legal/privacy-consent-v2026-06-26.md §①②③ 를 옮기되, 실제 수집 항목
//    (이름·휴대전화·성별·지역, profiles 테이블)과 동기화했다. service(이용약관)는 신규 초안.
//
// ConsentForm 의 ItemKey('terms'|'privacy'|'thirdparty'|'marketing')와 매핑:
//   terms → service (라벨 "서비스 이용약관")

export type TermKey = 'service' | 'privacy' | 'thirdparty' | 'marketing';

// 초안 버전. 실제 동의 이력 버전 기록(consent_log)은 이번 범위 밖.
export const TERM_VERSION = '2026-07-06-draft';

// 페이지 상단 고지 (초안 위상 명시)
export const TERM_DRAFT_NOTICE =
  '서비스 준비 중 초안입니다 · 최종 문구는 변호사 검토 후 확정됩니다';

export const TERM_PROCESSOR = '(주)골고루보상';

export interface TermSection {
  heading: string;
  body: string[]; // 문단 단위
}

export interface TermDoc {
  key: TermKey;
  title: string;
  required: boolean;
  summary: string; // 페이지 부제 한 줄
  sections: TermSection[];
}

export const TERMS: Record<TermKey, TermDoc> = {
  service: {
    key: 'service',
    title: '서비스 이용약관',
    required: true,
    summary: '골고루 SOS 서비스 이용에 관한 기본 약관',
    sections: [
      {
        heading: '제1조 (목적)',
        body: [
          `본 약관은 ${TERM_PROCESSOR}(이하 "회사")가 제공하는 골고루 SOS(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무를 규정함을 목적으로 합니다.`,
        ],
      },
      {
        heading: '제2조 (서비스의 성격)',
        body: [
          '서비스는 이용자가 입력한 긴급 상황을 분석하여 적합한 분야의 입점 전문가(변호사·노무사·손해사정사·세무사·변리사·의료 등)를 추천·연결하는 매칭 플랫폼입니다.',
          '회사는 전문가와 이용자를 연결하는 중개자이며, 법률·노무·세무·의료 등 개별 전문 상담의 당사자가 아닙니다. 실제 상담의 내용·품질·결과에 대한 책임은 해당 전문가에게 있습니다.',
        ],
      },
      {
        heading: '제3조 (이용자의 의무)',
        body: [
          '이용자는 가입 및 상담 요청 시 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.',
          '이용자는 서비스를 법령과 본 약관에 위반하거나 공서양속을 해치는 목적으로 이용해서는 안 됩니다.',
        ],
      },
      {
        heading: '제4조 (면책)',
        body: [
          '회사는 천재지변, 이용자의 귀책, 전문가의 상담 내용 등 회사의 통제를 벗어난 사유로 발생한 손해에 대해 책임을 지지 않습니다.',
          '회사는 전문가가 제공한 상담의 정확성·완전성을 보증하지 않으며, 상담 결과에 대한 판단과 책임은 이용자에게 있습니다.',
        ],
      },
      {
        heading: '제5조 (약관의 변경·분쟁)',
        body: [
          '회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 사전 공지합니다.',
          '본 약관과 서비스 이용에 관한 분쟁은 대한민국 법령에 따르며, 관할 법원은 민사소송법에 따라 정합니다.',
        ],
      },
    ],
  },

  privacy: {
    key: 'privacy',
    title: '개인정보 수집·이용 동의',
    required: true,
    summary: '전문가 상담 매칭을 위한 개인정보 수집·이용 (필수)',
    sections: [
      {
        heading: '수집 항목',
        body: [
          '성명, 휴대전화번호, 성별, 지역(시/도), 상담 요청 내용',
        ],
      },
      {
        heading: '수집·이용 목적',
        body: ['긴급 전문가 상담 매칭 및 응대, 회원 식별·관리'],
      },
      {
        heading: '보유·이용 기간',
        body: [
          '상담 요청 내용: 상담 종료 후 90일 이내 파기',
          '회원 정보(성명·휴대전화·성별·지역): 회원 탈퇴 시 지체 없이 파기',
        ],
      },
      {
        heading: '거부할 권리 및 불이익',
        body: [
          '귀하는 동의를 거부할 권리가 있습니다. 다만 거부 시 전문가 상담 매칭 서비스를 이용할 수 없습니다.',
        ],
      },
      {
        heading: '의료(MED) 분야 특칙',
        body: [
          '의료 상담은 건강정보(민감정보) 보호를 위해 상담 요청 내용을 저장하지 않습니다. 추천된 전문가에게 직접 연락해 주세요.',
        ],
      },
    ],
  },

  thirdparty: {
    key: 'thirdparty',
    title: '개인정보 제3자 제공 동의',
    required: true,
    summary: '매칭 전문가에게 상담 응대를 위한 정보 제공 (필수)',
    sections: [
      {
        heading: '제공받는 자',
        body: [
          '귀하가 요청한 분야의 매칭된 입점 전문가.',
          '실제 상담 전송 직전, 제공받는 전문가를 "○○세무사(사업자번호 …)" 형태로 특정하여 다시 고지합니다.',
        ],
      },
      {
        heading: '제공 항목',
        body: ['성명, 휴대전화번호, 상담 요청 내용'],
      },
      {
        heading: '제공받는 자의 이용 목적',
        body: ['상담 응대 (마케팅 목적이 아닙니다)'],
      },
      {
        heading: '보유·이용 기간',
        body: ['제공일로부터 90일 이내 파기'],
      },
      {
        heading: '거부할 권리 및 불이익',
        body: [
          '귀하는 동의를 거부할 권리가 있습니다. 다만 거부 시 전문가에게 상담을 연결할 수 없어 서비스를 이용할 수 없습니다.',
        ],
      },
      {
        heading: '의료(MED) 분야 특칙',
        body: ['의료 상담은 제3자(전문가)에게 상담 내용을 제공하지 않습니다.'],
      },
    ],
  },

  marketing: {
    key: 'marketing',
    title: '마케팅 활용·광고 수신 동의',
    required: false,
    summary: '서비스 혜택·이벤트 안내 수신 (선택 — 거부해도 서비스 이용 가능)',
    sections: [
      {
        heading: '수신 내용',
        body: ['서비스 관련 혜택·이벤트 안내 문자/알림 발송'],
      },
      {
        heading: '보유·이용 기간',
        body: ['동의 철회 시 또는 회원 탈퇴 시까지'],
      },
      {
        heading: '거부 시 안내',
        body: [
          '본 항목은 선택 사항입니다. 거부하셔도 서비스를 정상적으로 이용할 수 있으며, 안내성 발송만 수신하지 않습니다.',
          '동의는 언제든지 철회할 수 있습니다.',
        ],
      },
    ],
  },
};

// ConsentForm ItemKey → 약관 페이지 URL key 매핑
export function termKeyForItem(itemKey: 'terms' | 'privacy' | 'thirdparty' | 'marketing'): TermKey {
  return itemKey === 'terms' ? 'service' : itemKey;
}

export const TERM_KEYS = Object.keys(TERMS) as TermKey[];
