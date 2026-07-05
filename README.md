# golgoru-sos

## 소개
긴급 법률·노무·세무·의료·손해사정·변리·감정평가 상황을 음성/텍스트로 입력하면, 적합한 전문가를 추천해주는 SOS 플랫폼입니다.

- 프로덕션: https://golgorusos.co.kr
- 개발/테스트: https://golgoru-sos.vercel.app

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

검증 게이트는 `npx tsc --noEmit` 하나입니다(별도 lint/test 러너 없음).

## 배포
- Vercel 연동 (main push → 프로덕션 자동 배포)
- Supabase SQL은 `sql/` 폴더에 모아 두고 SQL Editor에 손수 적용 (`sql/supabase-setup.sql` 등, 각 파일 헤더의 순서/사전조건 참고)

## 문서 체계
- `docs/01-plan/` — 진행 중 계획 (MVP 플랜)
- `docs/02-design/` — 기능 설계 (`*.design.md`)
- `docs/04-report/` — 완료 보고서 (완료된 작업의 기록 SSoT)
- `docs/superpowers/specs`, `plans` — 개별 기능의 설계/구현 계획
- `docs/legal/` — 개인정보·약관 문구 SSoT

**완료된 주요 작업 기록**
- 소셜 로그인 + 로그인/가입/동의 플로우 + 커스텀 도메인 → [docs/04-report/auth-login-and-domain.report.md](docs/04-report/auth-login-and-domain.report.md)
- 음성 입력(Gemini STT) → [docs/04-report/voice-input-gemini.report.md](docs/04-report/voice-input-gemini.report.md)

## 개인정보·법적 주의사항
"상담 요청 DB화 + 전문가에게 제3자 제공" 구조라 기능 개발 전에 개인정보 동의, 제3자 제공 동의, 민감정보 처리, 보안/파기 정책을 먼저 고정해야 합니다. 사용자가 입력하는 상담 텍스트에는 의료·형사·세금·노무·가족관계 등 민감 내용이 섞일 수 있어 위험도가 높습니다. 동의 문구 SSoT는 `docs/legal/privacy-consent-v2026-06-26.md`.

1. **비밀번호 직접 수집·저장 금지** — 로그인 비밀번호는 Supabase Auth에 위임, 서비스 DB에 원문 저장 안 함. "상담 조회용 비공개 암호"가 필요하면 bcrypt/argon2 해시 저장.
2. **상담 텍스트 저장은 명시 동의 필요** (개인정보 보호법 제15조) — 수집 목적·항목·보유 기간·거부권 고지.
3. **전문가 전달은 제3자 제공** (제17조) — 제공받는 자·목적·항목·보유 기간·거부권 별도 고지/동의. 전송 직전 특정 전문가를 명시.
4. **의료/건강정보는 민감정보** (제23조) — 의료 분야는 "저장·전달 안 함"으로 제한하거나 별도 동의 + 강한 보안조치.
5. **보관 기간·파기 정책** (제21조) — 목적 달성 후 파기. "종료 후 90일 이내 파기"가 출발점. DB에 `expires_at`/`deleted_at`, 파기 배치/cron, 관리자 삭제 기능 필요.

> 위는 법률 자문이 아니며, 런칭 전 변호사 검토가 필요합니다.
