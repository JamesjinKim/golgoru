// 어드민 클라이언트 공용 fetch.
// 세션 만료/무효(401)로 응답하면 즉시 로그인 화면으로 이동시켜, "로그인된 것처럼
// 보이지만 실제로는 끊긴" 상태가 화면에 남지 않도록 한다.
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    window.location.pathname !== '/admin/login'
  ) {
    window.location.href = '/admin/login';
  }
  return res;
}
