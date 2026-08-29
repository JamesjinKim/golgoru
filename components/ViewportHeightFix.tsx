'use client';

import { useEffect } from 'react';

/**
 * TWA(Chrome)에서 당겨서 새로고침한 뒤 min-height:100dvh가 실제 뷰포트보다
 * 큰 값으로 고정되는 문제를 보정한다.
 *
 * 실측(SM-A346N / Chrome 151): 새로고침 직후 100dvh를 새로 측정하면 757px이
 * 나오는데도 컨테이너의 계산된 min-height는 813.511px로 남는다. 이전(주소창
 * 포함) 뷰포트 기준 값이 갱신되지 않는 것으로, dvh·svh·lvh 어떤 단위로도
 * 해결되지 않는다. flex:1인 main이 그 차이만큼 늘어나 footer를 화면 밖으로
 * 밀어내고 스크롤이 생긴다.
 *
 * 실제 innerHeight를 --app-vh에 넣어 레이아웃 컨테이너가 이를 쓰게 한다.
 * CSS 단위 해석을 거치지 않으므로 stale 값의 영향을 받지 않는다.
 */
export default function ViewportHeightFix() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
    };
    apply();
    // 회전·주소창 표시 변화 등 뷰포트가 바뀌는 모든 시점에 갱신
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.visualViewport?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, []);

  return null;
}
