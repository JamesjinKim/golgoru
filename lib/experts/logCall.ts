// 전화 버튼 클릭(연결 시도)을 서버에 기록. tel: 링크는 즉시 전화 앱으로 전환되며
// 페이지가 언로드될 수 있으므로 navigator.sendBeacon으로 보낸다(언로드 중에도 전송 보장).
// user_id는 서버가 세션으로 재확정하므로 여기선 expertId·vertical·source만 보낸다.
export function logCall(expertId: string, vertical: string, source: 'detail' | 'contact' | 'card') {
  if (typeof navigator === 'undefined' || !expertId) return;
  const payload = JSON.stringify({ expertId, vertical, source });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/calls', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    /* sendBeacon 실패 시 아래 fetch 폴백 */
  }
  // 폴백: keepalive fetch (전환 중에도 시도)
  try {
    fetch('/api/calls', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true });
  } catch {
    /* 로깅 실패는 무시(사용자 흐름 우선) */
  }
}
