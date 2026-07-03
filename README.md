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

# 도메인 설정 순서 www.golgorusos.co.kr
 지금 할 일 (순서 확정)
네임서버가 가비아로 정상이니, 전파를 기다리는 것과 무관하게 지금 바로 설정을 다 해둘 수 있습니다. 전파되는 순간 바로 연결되도록요.

① Vercel — 도메인 2개 추가
https://vercel.com → golgoru-sos 프로젝트 → Settings → Domains
golgorusos.co.kr 추가 (메인)
www.golgorusos.co.kr 추가 → "Redirect to golgorusos.co.kr" 선택
→ 화면에 뜨는 A 레코드 IP 값을 메모 (보통 216.198.79.1)
② 가비아 — DNS 레코드 2개 입력
My가비아 → DNS 관리툴 → golgorusos.co.kr → DNS 설정

타입	호스트	값
A	@	(Vercel 화면에 뜬 IP)
CNAME	www	cname.vercel-dns.com
오늘 갓 등록한 도메인이라 가비아 기본 파킹 레코드가 있을 수 있습니다 → 있으면 지우고 위 값으로 교체.

③ 대기 + 확인
갓 등록 + DNS 설정이라 오늘은 수 시간 걸릴 수 있습니다 (조급해하지 마세요, 정상입니다)
Vercel Domains 화면이 초록색 Valid로 바뀌면 완료, HTTPS는 자동


# 주의사항.
 “상담 요청 DB화 + 전문가에게 제3자 제공” 구조라서 기능 개발 전에 개인정보 동의, 제3자 제공 동의, 민감정보 처리, 보안/파기 정책을 먼저 고정해야 합니다.
  특히 사용자가 입력하는 상담 텍스트에는 의료, 형사, 세금, 노무, 가족관계 같은 민감한 내용이 섞일 수 있어 일반 문의 저장보다 위험도가 높습니다.

  핵심 판단
  현재 방향은 가능하지만, 아래 조건을 충족해야 합니다.

  1. 사용자 비밀번호는 직접 수집/저장하면 안 됩니다.
     로그인 비밀번호는 Supabase Auth 같은 인증 시스템에 맡기고, 서비스 DB에는 원문 비밀번호를 저장하지 않는 구조가 맞습니다. 만약 “상담 조회용 비공개 암호”를 의미한 것이라면 원문 저장 금지,
     bcrypt/argon2 같은 해시 저장 방식으로 설계해야 합니다.

  2. 상담 텍스트 저장은 명시 동의가 필요합니다.
     개인정보 보호법 제15조 기준으로 수집 목적, 수집 항목, 보유 기간, 동의 거부권을 고지해야 합니다. 현재 docs/legal/privacy-consent-v2026-06-26.md에 초안은 이미 있습니다.

  3. 전문가에게 넘기는 것은 제3자 제공입니다.
     개인정보 보호법 제17조 기준으로 제공받는 자, 제공 목적, 제공 항목, 제공받는 자의 보유 기간, 거부권을 별도 고지/동의해야 합니다. “매칭된 전문가”라고만 두기보다 실제 전송 직전에 홍길동 세
     무사 / ○○법률사무소처럼 특정해서 보여주는 게 안전합니다.

  4. 의료/건강정보는 별도 취급해야 합니다.
     개인정보 보호법 제23조상 건강정보는 민감정보입니다. 현재 법무/노무/세무/의료가 같은 입력창을 쓰기 때문에, 의료 분야는 “상담 내용 저장 및 전문가 전달 안 함”으로 제한하거나, 민감정보 별도
     동의와 강한 보안조치를 붙여야 합니다. 현재 문서 초안은 의료 상담 저장/제공 회피 방향이라 적절합니다.

  5. 보관 기간과 파기 정책이 필요합니다.
     제21조 기준으로 목적 달성 후 파기해야 합니다. 초안의 “상담 종료 후 90일 이내 파기”는 합리적인 출발점입니다. 다만 실제 DB에는 expires_at, deleted_at, 파기 배치/cron, 관리자 삭제 기능이
     필요합니다.

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

## 카카오 로그인 — 구현 상태 (feature/kakao-login)

로그인/가입/동의 4화면 플로우 + 카카오/구글 OAuth 코드는 구현 완료되었습니다(기존 Supabase OAuth 파이프라인 위에 얹는 방식, `proxy.ts`·admin 인증 무수정). 실제 동작에는 아래 두 가지 **수동 작업**이 필요합니다.

1. **카카오 콘솔 + Supabase Kakao Provider 설정** — 위 1~7단계 진행 (미완료 시 카카오 버튼은 "준비 중" 안내를 띄우고 조용히 degrade).
2. **DB 마이그레이션** — `supabase-consent-setup.sql`을 Supabase SQL Editor에 적용해야 동의 저장(`/api/auth/consent`)이 동작합니다. 미적용 시 동의 저장 API가 실패합니다.

- 설계: `docs/superpowers/specs/2026-07-03-kakao-login-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-03-kakao-login.md`
- 신규 라우트: `/login`, `/signup`, `/consent`, `/api/auth/consent`
- 동의는 OAuth 콜백 성공 후 신규 가입자에게 1회 게이팅(필수 3개: 이용약관·개인정보 수집·제3자 제공). 재로그인 동의완료자는 통과.
- 후속 과제(비목표): 세션 유지 중 홈 직접 접근 시 게이트 우회 가능 → SOS 제출 시점 상시 동의 가드 권장.