// 인앱 브라우저(웹뷰) 감지 — 구글 OAuth의 disallowed_useragent(403) 대응.
// 구글은 카카오톡·인스타 등 앱 내장 웹뷰에서의 OAuth를 보안정책으로 차단한다.
// navigator를 직접 참조하지 않고 ua를 인자로 받아 순수 함수로 둔다(SSR/테스트 안전).

export type InAppKind =
  | 'kakaotalk'
  | 'instagram'
  | 'facebook'
  | 'naver'
  | 'line'
  | 'daum'
  | 'webview' // 기타 안드로이드 웹뷰
  | null;

// UA 시그니처 → 종류. 위에서부터 우선 매칭(구체적인 앱을 일반 webview보다 먼저).
const SIGNATURES: { kind: Exclude<InAppKind, null>; test: RegExp }[] = [
  { kind: 'kakaotalk', test: /KAKAOTALK/i },
  { kind: 'instagram', test: /Instagram/i },
  { kind: 'facebook', test: /\bFBAN\b|\bFBAV\b|FB_IAB/i },
  { kind: 'naver', test: /NAVER\(inapp|NAVER\b/i },
  { kind: 'line', test: /\bLine\//i },
  { kind: 'daum', test: /DaumApps|DaumDevice/i },
  // 안드로이드 웹뷰 일반 신호: "; wv" (WebView). iOS는 신뢰할 UA 신호가 약해 위 앱별 매칭에 의존.
  { kind: 'webview', test: /;\s*wv\b|\bwv\)/i },
];

export function detectInAppBrowser(ua?: string | null): InAppKind {
  if (!ua) return null;
  for (const sig of SIGNATURES) {
    if (sig.test.test(ua)) return sig.kind;
  }
  return null;
}

export function isInAppBrowser(ua?: string | null): boolean {
  return detectInAppBrowser(ua) !== null;
}

// 카카오톡 인앱에서 현재 URL을 외부 브라우저(Chrome/Safari)로 강제로 연다.
// 카카오톡 전용 스킴. 다른 웹뷰(iOS 인스타 등)는 프로그램적 탈출 API가 막혀 있어
// UI에서 "메뉴 → 브라우저로 열기" 텍스트 안내로 대체한다.
export function openExternalFromKakaoTalk(url: string): void {
  if (typeof window === 'undefined') return;
  const target = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  window.location.href = target;
}
