# golgoru-sos

## 소개
긴급 법률·노무·세무·의료·손해사정·변리·감정평가 상황을 음성/텍스트로 입력하면, 적합한 전문가를 추천해주는 SOS 플랫폼입니다.

## 기술 스택
- Next.js App Router
- Supabase (DB + Auth)
- Gemini (분류 + 받아쓰기)
- Tailwind CSS v4
- TypeScript

## 개발 환경
1. 저장소 클론
2. `cp .env.example .env.local`
3. `npm install`
4. `npm run dev`

## 배포
- Vercel 연동
- Supabase SQL은 `supabase-setup.sql` 참고



카카오 로그인 구현 — 당신이 할 일 (순서대로)
1단계: 카카오 개발자 계정 만들기
https://developers.kakao.com 접속 → 카카오 계정으로 로그인
상단 내 애플리케이션 → 애플리케이션 추가하기
앱 이름(예: 골고루 SOS), 사업자명 입력 → 저장
만들어진 앱 클릭해서 들어가기
2단계: 앱 키 확인 (메모해두기)
좌측 앱 설정 → 앱 키 메뉴
여기서 REST API 키를 복사해둡니다 → 이게 Supabase에 넣을 "Client ID"입니다
3단계: 보안 키(Client Secret) 발급
좌측 제품 설정 → 카카오 로그인 → 보안 메뉴
Client Secret 코드 생성 → 활성화 상태: 사용함으로 변경
생성된 코드 복사해둡니다 → 이게 Supabase에 넣을 "Client Secret"입니다
4단계: 카카오 로그인 활성화 + 동의항목 설정
제품 설정 → 카카오 로그인 → 활성화 설정 ON
동의항목 탭에서 최소한 닉네임(profile_nickname)을 "필수 동의"로 설정
⚠️ 이메일은 카카오에서 비즈앱 심사를 받아야 받을 수 있어요. 처음엔 이메일 없이 닉네임만으로 시작하는 걸 권합니다.
5단계: Supabase에서 카카오 활성화 (여기서 Redirect URL을 얻습니다)
https://supabase.com → 이 프로젝트 대시보드 접속
좌측 Authentication → Providers (또는 Sign In / Providers)
목록에서 Kakao 찾아서 클릭 → Enable 켜기
3단계에서 복사한 값들을 입력:
Client ID ← 2단계의 REST API 키
Client Secret ← 3단계의 Client Secret
이 화면에 표시되는 **Callback URL (Redirect URI)**를 복사해둡니다
형태: https://<프로젝트>.supabase.co/auth/v1/callback
6단계: 카카오 콘솔에 Redirect URI 등록 (5단계 값을 가져와 붙이기)
카카오 콘솔 → 제품 설정 → 카카오 로그인 → Redirect URI
5단계에서 복사한 Supabase Callback URL을 그대로 붙여넣기 → 저장
7단계: 사이트 도메인 등록
카카오 콘솔 → 앱 설정 → 플랫폼 → Web → 사이트 도메인 추가
개발용: http://localhost:3000
배포용: 실제 도메인 (예: https://golgoru.vercel.app)
여기까지가 당신이 콘솔에서 하는 설정이고, 끝나면 알려주세요. 그러면 제가 코드 쪽(startUserLogin.ts에 카카오 옵션 추가 + 로그인 버튼에 카카오 항목 추가)을 바로 작업해드리겠습니다.

진행 방식을 하나만 정하고 갈게요:

AskUserQuestion
OUT
Your questions have been answered: "카카오 로그인 버튼을 기존 구글 로그인과 어떻게 함께 둘까요?"="구글 + 카카오 둘 다". You can now continue with these answers in mind.
좋습니다. 구글 + 카카오 둘 다 두는 방향으로 가겠습니다. 그러면 5단계에서 콘솔 설정이 끝나면, 제가 다음 두 군데를 손볼게요:

lib/auth/startUserLogin.ts — provider를 인자로 받게 바꿔서 'google' / 'kakao' 둘 다 호출 가능하게
components/UserAuthChip.tsx — 구글 버튼 옆/아래에 카카오 버튼 추가
정리: 지금 당신이 할 일
위 1~7단계 콘솔 설정을 진행하시면 됩니다. 핵심 흐름만 다시 요약하면:

카카오 개발자 콘솔: 앱 생성 → REST API 키 + Client Secret 확보 → 카카오 로그인 활성화 → 닉네임 동의항목 설정
Supabase 콘솔: Kakao Provider 켜고 위 두 키 입력 → 표시되는 Callback URL 복사
다시 카카오 콘솔: 그 Callback URL을 Redirect URI에 등록 + 사이트 도메인(localhost:3000) 등록
💡 가장 헷갈리는 포인트: 키는 카카오 → Supabase 방향으로 넣고, Callback URL은 Supabase → 카카오 방향으로 넣습니다. 양방향이라 처음엔 순서가 꼬이기 쉬우니 위 순서(2→3→5→6)대로만 따라가세요.

설정 다 하시고 "콘솔 설정 끝났어" 하고 알려주시면, 그때 바로 코드 작업 들어가겠습니다. 진행하다가 막히는 화면 있으면 캡처나 메시지로 물어봐 주세요.

참고: 카카오 로그인은 이메일을 기본 제공하지 않습니다. 이 프로젝트가 사용자 식별에 이메일을 꼭 써야 한다면, 카카오 비즈앱 전환 심사가 추가로 필요합니다. 우선 닉네임만으로 붙여보고, 이메일이 꼭 필요해지면 그때 별도로 안내드릴게요.