---
template: design
version: 1.0
feature: expert-photo
date: 2026-06-26
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
---

# expert-photo Design Document (전문가 미니 사진 아바타)

> **Summary**: 현재 전문가 아바타는 이름 첫 글자(`name.charAt(0)`)를 그라데이션 원에 표시하는 이니셜 폴백뿐이다. 여기에 **실제 전문가 사진**을 넣는다. 관리자가 어드민에서 업로드하면, 서버가 **제각각인 원본을 자동 중앙 크롭 + 256×256 리사이즈**해 Supabase Storage에 표준화 저장하고, UI는 사진이 있으면 사진을, 없으면 기존 이니셜을 표시한다.
>
> **Status**: Draft (구현 대기)
> **상위 맥락**: [experts-schema.design.md](./experts-schema.design.md) (Expert 엔티티), [admin-dashboard.design.md](./admin-dashboard.design.md) (ExpertForm)
> **결정 근거**: 2026-06-26 사용자 확정 (§2 결정표)

---

## 1. 현황 (코드 기준)

이니셜 아바타가 렌더링되는 위치 — 동일 로직이 3곳에 흩어져 있음:

| 위치 | 파일 | 용도 | 표시 크기 |
|---|---|---|---|
| 추천/브라우즈 카드 | [components/ExpertCard.tsx](../../../components/ExpertCard.tsx) | 목록 카드 | 48px |
| 전문가 미니 홈피 | [app/(site)/expert/[id]/page.tsx](../../../app/(site)/expert/[id]/page.tsx) | 상세 프로필 | 48px(확대 여지) |
| 관리자 입력폼 | [components/admin/ExpertForm.tsx](../../../components/admin/ExpertForm.tsx) | 미리보기 | 48px |

**렌더링 로직**: `linear-gradient(135deg, …)` 원 + `{expert.name.charAt(0)}`

**갭**:
- [Expert 타입](../../../lib/types.ts) 에 사진 필드 **없음**
- `experts` 테이블에 사진 컬럼 **없음**
- 이미지 저장소 **없음**, 업로드 경로 **없음**
- `next.config.js` 에 `images` 설정 **없음**

→ 데이터 계층부터 UI 끝단까지 한 줄로 새로 뚫어야 함. 단순 CSS 변경이 아님.

---

## 2. 결정표 (2026-06-26 사용자 확정)

| 쟁점 | 결정 | 비고 |
|---|---|---|
| 이미지 저장소 | **Supabase Storage** | 이미 Supabase 사용 중 |
| 업로드 주체 | **관리자(어드민)만** | 어드민 인증 체계 재사용 |
| 사이즈 표준화 | **업로드 시 서버 자동 중앙 크롭 + 256×256 리사이즈** | 원본 제각각 → 저장 시점 통일 |
| 표시 마감 | **CSS `object-fit: cover`** | 어떤 표시 크기 원에도 맞춤 |
| 사진 없을 때 | **기존 이니셜 폴백 유지** | 사진은 보너스, 폴백이 메인 |

---

## 3. 데이터 계층

### 3.1 DB 마이그레이션 (idempotent)
신규 SQL 파일(예: `supabase-expert-photo.sql`), `supabase-schema-v2.sql` 패턴 준수:

```sql
alter table experts add column if not exists photo_url text;
```

### 3.2 타입
[lib/types.ts](../../../lib/types.ts) `Expert` 인터페이스에 추가:

```ts
photo_url?: string | null;  // Supabase Storage public URL. 없으면 이니셜 폴백
```

### 3.3 Repository 정합
- **mock-repository**: 시드 데이터에 `photo_url` 포함(대부분 `null`). 누락 시 `tsc` 계약 테스트(`tests/experts-repository.contract.ts`) 실패.
- **supabase-repository**: `listRecommended` / `listBrowse` / `findById` SELECT 에 `photo_url` 포함.

---

## 4. Supabase Storage

### 4.1 버킷
- 버킷명: `expert-photos`
- 공개 설정: **Public 읽기 허용** (공개 프로필 표시용)
- 경로 규칙: `expert-photos/{expert_id}.webp` (전문가당 1장, 덮어쓰기)

### 4.2 접근 정책 (RLS)
- **읽기**: 공개 (anon 허용)
- **쓰기/삭제**: service-role 만 → 어드민 라우트가 `supabaseAdmin`(서버 전용) 으로만 업로드. 클라이언트 직접 업로드 금지.

---

## 5. 업로드 (어드민)

### 5.1 라우트
- 위치(안): `app/api/admin/experts/[id]/photo/route.ts` (기존 `app/api/admin/experts/[id]` 구조 확장)
- 가드: `proxy.ts` 매처(`/api/admin/*`) + 라우트 내 `requireAdmin()` (기존 패턴 동일)

### 5.2 처리 파이프라인
1. `multipart/form-data` 로 파일 수신
2. **검증**: 포맷(jpg/png/webp), 용량 상한 **2MB**, 이미지 MIME 확인
3. **변환** (`sharp`): 중앙 정사각 크롭 → **256×256 리사이즈** → **webp 인코딩**
4. Supabase Storage `expert-photos/{id}.webp` 업로드(덮어쓰기)
5. 반환된 public URL 을 `experts.photo_url` 에 저장
6. 응답: `{ photo_url }`

### 5.3 의존성
- **`sharp`** 추가 필요 (현재 미설치). Node 서버 라우트에서 실행.

### 5.4 ExpertForm UI
- 파일 선택 + 즉시 미리보기 + 업로드 버튼
- 업로드 성공 시 미리보기를 새 `photo_url` 로 갱신
- 삭제(사진 제거 → 이니셜 폴백 복귀) 옵션

---

## 6. 표시 (UI 공통화) ⭐

### 6.1 공통 컴포넌트 추출
3곳에 흩어진 아바타 로직을 **`components/ExpertAvatar.tsx`** 단일 컴포넌트로 추출.

```
<ExpertAvatar expert={expert} size={48} />
```

- `photo_url` 있으면 → `next/image` `<Image>` + `object-fit: cover` + 원형
- 없으면 → 기존 이니셜 그라데이션 폴백 (`name.charAt(0)`)
- `size` prop 으로 카드 48 / 미니홈피 확대 대응

### 6.2 next.config.js
Supabase Storage 도메인을 `images.remotePatterns` 에 등록(Next `<Image>` 외부 도메인 허용).

> ⚠️ **AGENTS.md 규칙**: `next.config.js` images 설정과 `<Image>` 사용은 Next.js 런타임 코드다. 구현 시 `node_modules/next/dist/docs/` 의 이미지 관련 로컬 가이드를 먼저 확인할 것(이 프로젝트는 특수 Next 버전).

---

## 7. 작업 순서 / 규모

| 단계 | 내용 | 규모 |
|---|---|---|
| 1 | DB 컬럼 + 타입 + repo 정합 | 작음 |
| 2 | Supabase 버킷 + 정책 생성(대시보드) | 작음 |
| 3 | `sharp` 추가 + 업로드 라우트 | 중간 |
| 4 | ExpertForm 업로드 UI | 중간 |
| 5 | `<ExpertAvatar>` 추출 + 3곳 교체 + next.config | 작음~중간 |

→ 한 PR 규모. 검증 게이트는 `npx tsc --noEmit`(repo 계약 포함).

---

## 8. 비범위 (Out of Scope)

- 전문가 본인 업로드(권한 체계) — 현 단계는 어드민 전용
- 다중 사진/갤러리 — 전문가당 1장
- Supabase 이미지 변환 API(Pro 유료) — 서버 `sharp` 로 대체
- 소비자 개인정보 트랙과 무관(전문가 사진 = 공개 프로필 정보)
