<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses a Next.js version with breaking changes. APIs, conventions, and file structure may differ from training-data assumptions.

Before editing Next.js runtime code, read the relevant local guide in `node_modules/next/dist/docs/` and heed deprecation notices. This applies to changes under `app/`, `components/`, route handlers, middleware/proxy, metadata, data fetching, caching, or build configuration.

Documentation-only work, git hygiene, assets, and non-Next.js files do not require a Next.js docs read unless they affect runtime behavior.
<!-- END:nextjs-agent-rules -->

## 프로젝트 개요

골고루 SOS — 긴급 법률·회계·세무·노무·의료·손해사정·변리·감정평가 상황을 음성/텍스트로 입력하면 적합한 전문가를 추천하는 양면시장 플랫폼.
- 기술 스택: Next.js 16.2 (App Router) + React 19 + Supabase + Gemini + Tailwind CSS v4, TypeScript strict.

## 주요 명령어

```bash
npm run dev      # 로컬 개발 서버 실행 (next dev --webpack)
npm run build    # 프로덕션 빌드 (next build)
npm run start    # 프로덕션 서버 실행
npx tsc --noEmit # TypeScript 전체 타입 체크 (품질 검증 게이트)
```

- 별도의 linter 및 test runner 없이 `npx tsc --noEmit`을 핵심 타입 검증 게이트로 사용합니다.
- `tests/experts-repository.contract.ts`는 컴파일 타임 인터페이스 계약 검증 파일입니다.

## 환경 변수 (.env.local)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — 클라이언트/익명 Supabase 접근
- `SUPABASE_SECRET_KEY` — service-role 키, 서버 전용 (어드민 CRUD 및 데이터 마스터 접근)
- `GEMINI_API_KEY` — 누락 시 텍스트 분류는 로컬 키워드 규칙으로 폴백, 음성 분류는 503 반환
- `GOLGORU_DATA_SOURCE` — `supabase` 설정 시 실서버 DB 연결, 그 외에는 Mock 데이터 사용

## 아키텍처 규칙

1. **라우팅 그룹**:
   - `app/(site)/`: 일반 소비자 서비스 플로우 (SOS 입력 → 결과 및 전문가 추천 → 미니홈피/상세)
   - `app/(admin)/`: 운영자 관리자 대시보드 (`/admin`)
   - `app/api/`: 퍼블릭 API 및 어드민 전용 API (`/api/admin/*`)
2. **인증 및 동의 경계 (`proxy.ts`)**:
   - Next.js 16 규칙에 따라 `middleware` 대신 `proxy.ts` 진입점(`proxy()` + `config.matcher`)을 사용합니다.
   - `/admin/:path*` 및 `/api/admin/:path*`를 보호하며, 일반 소비자의 필수 약관 동의 미완료 시 `/consent`로 리다이렉트합니다.
3. **데이터 소스 추상화 (`lib/experts/repository.ts`)**:
   - 구체적인 리포지토리를 직접 import하지 않고, 항상 `getExpertRepository()`를 호출합니다.
   - `ExpertRepository` 인터페이스를 통해 Mock과 Supabase 구현체가 동일한 메소드를 제공합니다.
4. **AI 분류 및 하이브리드 추천 엔진 (`lib/gemini.ts`, `lib/experts/hybridRecommend.ts`)**:
   - 텍스트 입력: Gemini `flash-lite` (thinking off) 사용 → 429/500/503 오류 시 로컬 키워드 매칭(`localClassify`)으로 무중단 폴백.
   - 음성 입력: Gemini를 통한 1회 호출 STT 받아쓰기 + 분류 동시 처리.
   - 하이브리드 교차 추천: 법인 결산, 가업승계 등 복합 사안 시 `secondary_vertical`을 판단하여 회계사와 세무사를 함께 혼합 추천.
5. **전문가 직역 및 카테고리 (Taxonomy)**:
   - 8개 직역: `lawyer`(변호사), `accountant`(회계사), `tax`(세무사), `labor`(노무사), `patent`(변리사), `adjuster`(손해사정사), `doctor`(병원), `appraiser`(감정평가사).
   - 정규화 카테고리 코드(`LAW-*`, `ACC-*`, `TAX-*`, `LAB-*`, `PAT-*`, `INS-*`, `MED-*`, `APR-*`)가 라우팅을 주도합니다.

## 데이터베이스 운영 원칙

- 모든 SQL은 `sql/` 디렉토리에 관리되며, 재실행 안전(idempotent)하게 작성됩니다.
- 스키마 변경 시 Supabase SQL Editor에서 손수 적용합니다.

## 모든 답변은 한글로 할것!