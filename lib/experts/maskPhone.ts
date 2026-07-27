// 전문가 전화번호를 로그인 사용자에게만 노출한다(홍보·SEO 위해 나머지 정보는 공개).
// 화면에서 숨기기만 하면 우회 가능하므로, 비로그인 시 서버에서 phone을 빈 값으로 만들어
// 애초에 클라이언트로 내려보내지 않는다. UI는 phone이 빈 값이면 잠금(로그인 유도)을 표시.

export function stripPhoneIfGuest<T extends { phone: string }>(experts: T[], signedIn: boolean): T[] {
  if (signedIn) return experts;
  return experts.map((e) => (e.phone ? { ...e, phone: '' } : e));
}
