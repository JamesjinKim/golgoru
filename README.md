# golgoru-sos

## 소개
긴급 법률·노무·세무·의료 상황을 음성/텍스트로 입력하면, 적합한 전문가를 추천해주는 SOS 플랫폼입니다.

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
