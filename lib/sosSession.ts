// SOS 입력·분류 결과의 브라우저 세션 캐시.
// 상담 내용(성범죄·의료 등 민감 정보)이 담기므로 로그아웃 시 반드시 정리한다.
// 서버 라우트에서는 접근 불가(브라우저 저장소) — 클라이언트에서 호출해야 한다.

export const SOS_SESSION_KEYS = [
  'sosQuery',
  'classifyResult',
  'recommendedExperts',
] as const;

export function clearSosSession() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of SOS_SESSION_KEYS) {
      sessionStorage.removeItem(key);
    }
  } catch {
    // 사생활 보호 모드 등에서 sessionStorage 접근이 차단될 수 있다 — 무시
  }
}
