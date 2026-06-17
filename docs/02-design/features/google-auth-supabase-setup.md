# Google Auth + Supabase 설정 기록

작성일: 2026-06-17

## 현재 구현 범위

- 일반 사용자 로그인은 Supabase Auth OAuth의 Google provider를 사용한다.
- 홈 헤더의 `로그인` 버튼이 Google OAuth를 시작한다.
- OAuth callback은 `/auth/callback`에서 처리한다.
- 로그인 성공 시 `auth.users` 사용자 정보를 기준으로 `public.profiles` row를 생성 또는 갱신한다.
- 이번 범위에는 Kakao, 찜, 상담요청 저장, 추천 결과/전화 연결 로그인 게이트, 전문가 신청/승인이 포함되지 않는다.

## 필수 설정

Google Cloud Console OAuth Client:

- Application type: `Web application`
- Authorized JavaScript origins:
  - `http://localhost:3000`
- Authorized redirect URIs:
  - `https://dmyxxnkqyzkvkxvpwild.supabase.co/auth/v1/callback`

Supabase Dashboard:

- `Authentication` -> `Providers` -> `Google`
  - Google provider enabled
  - Google Cloud의 Client ID 입력
  - Google Cloud의 Client Secret 입력
- `Authentication` -> `URL Configuration` -> Redirect URLs
  - `http://localhost:3000/auth/callback`
  - 운영 배포 후 `https://<production-domain>/auth/callback` 추가

Database:

- `supabase-user-auth.sql`을 Supabase SQL Editor에서 실행한다.
- 생성 대상:
  - `public.profiles`
  - `set_profiles_updated_at()` trigger function
  - `profiles self select`
  - `profiles self update`

## 로컬 확인 절차

1. `npm run dev`
2. `http://localhost:3000` 접속
3. 홈 헤더 `로그인` 클릭
4. Google 계정 선택
5. 홈으로 돌아온 뒤 사용자 이름과 `로그아웃`이 보이는지 확인
6. `로그아웃` 클릭 후 다시 `로그인` 버튼으로 돌아오는지 확인

DB 확인 쿼리:

```sql
select
  u.id,
  u.email,
  u.raw_app_meta_data->'providers' as providers,
  p.role,
  p.display_name,
  p.email as profile_email
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = '<테스트 이메일>';
```

정상 예:

```text
providers      ["google"]
role           user
profile_email  <테스트 이메일>
```

## 트러블슈팅 기록

### Unsupported provider: provider is not enabled

원인: Supabase Google provider가 꺼져 있거나 저장되지 않은 상태.

해결:

- Supabase Dashboard `Authentication` -> `Providers` -> `Google`에서 provider를 켠다.
- Client ID와 Client Secret을 저장한다.

### 400 redirect_uri_mismatch

원인: Google Cloud Console OAuth Client의 Authorized redirect URI가 실제 요청값과 다름.

Google Cloud Console에 반드시 아래 값을 등록한다.

```text
https://dmyxxnkqyzkvkxvpwild.supabase.co/auth/v1/callback
```

Supabase Redirect URLs에는 아래 값을 등록한다.

```text
http://localhost:3000/auth/callback
```

### profile lookup error

원인: `public.profiles` 테이블이 아직 생성되지 않았거나 PostgREST schema cache에 반영되지 않은 상태.

해결:

- `supabase-user-auth.sql` 실행
- 10-30초 뒤 새로고침
- 기존 로그인 사용자는 다시 로그인하거나 service role로 profile row를 보강한다.

### golgorusos@gmail.com 테스트 주의

`golgorusos@gmail.com`은 `public.admin_users`에 연결된 어드민 계정이다. 일반 사용자 Google OAuth 테스트 계정으로 삭제하거나 재생성하지 않는다.

일반 사용자 로그인 테스트는 `drjins@gmail.com` 또는 별도 테스트 Gmail 계정을 사용한다.
