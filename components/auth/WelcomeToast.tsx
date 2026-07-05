'use client';

import { useEffect, useState } from 'react';

// 로그인 완료 직후 /?welcome=1 로 도착했을 때 딱 한 번만 뜨는 환영 토스트.
// 표시하는 즉시 URL에서 welcome 파라미터를 제거하므로, 새로고침·뒤로가기·재방문 시에는 뜨지 않는다.
export default function WelcomeToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') !== '1') return;

    setShow(true);

    // URL에서 welcome 제거 (히스토리 항목은 그대로 두고 쿼리만 정리 → 뒤로가기해도 재현 안 됨)
    params.delete('welcome');
    const query = params.toString();
    const cleaned = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', cleaned);

    const timer = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      background: '#0e1420', color: '#fff', fontSize: 13, fontWeight: 700,
      padding: '11px 14px', borderRadius: 12, textAlign: 'center', marginBottom: 16,
    }}>
      환영합니다. 골고루 SOS를 시작합니다
    </div>
  );
}
