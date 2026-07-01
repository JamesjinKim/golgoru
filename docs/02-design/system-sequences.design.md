# golgoru-sos 전체 시스템 시퀀스 다이어그램

> 작성 2026-06-13 · 기준 커밋 `779b616` (세무사 단일화 반영)
> 목적: **유지보수 및 개발자 미션별 업무 분해**의 기준 문서. 각 기능이 어느 모듈·함수·테이블을 거치는지 추적 가능하게 한다.

## 0. 단위 선택 기준

| 축 | 선택 단위 | 표기 방식 |
|---|---|---|
| 다이어그램 분리 | **임무(기능) 단위** — F1~F9 + 예정 1건 | 기능당 다이어그램 1개 |
| 참여자(participant) | **모듈 단위** — 컴포넌트 / API 라우트 / lib 모듈 / 외부 서비스 / DB | 파일 경로 명시 |
| 메시지(화살표) | **함수·엔드포인트 단위** | `함수명()` / `METHOD /경로` 표기 |
| DB | **테이블 단위** | 메시지에 테이블·연산 명시 |

> 읽는 법: 다이어그램의 화살표 라벨에 있는 함수명을 그대로 grep 하면 코드 위치가 나온다. §12의 모듈-파일 매핑과 함께 사용.

---

## 1. 시스템 컨텍스트 (모듈 지도)

```mermaid
flowchart LR
  subgraph Client["브라우저 (모바일 웹/PWA)"]
    HOME["/ 메인<br/>SosInput.tsx"]
    RESULT["/result<br/>result/page.tsx"]
    BROWSE["/experts 둘러보기<br/>experts/page.tsx + ExpertBrowseList.tsx"]
    DETAIL["/expert/[id] 미니홈피<br/>expert/[id]/page.tsx"]
    ADMIN["/admin 어드민<br/>(admin)/admin/*"]
  end

  subgraph Server["Next.js 16 서버 (Vercel)"]
    CLS["/api/classify"]
    EXP["/api/experts<br/>/api/experts/browse"]
    AAPI["/api/admin/*<br/>(auth·experts·import·categories)"]
    GM["lib/gemini.ts<br/>classifyQuery·classifyAudio·localClassify"]
    REPO["lib/experts/repository.ts<br/>getExpertRepository()"]
    SREPO["supabase-repository.ts"]
    MREPO["mock-repository.ts"]
    GRD["lib/admin/auth.ts<br/>requireAdmin()"]
    CSV["lib/admin/csv.ts<br/>parseExpertsCsv()"]
    AUD["lib/admin/audit.ts<br/>logAudit()"]
  end

  subgraph Ext["외부 서비스"]
    GEM["Gemini API<br/>2.5-flash-lite / 2.5-flash"]
    SBA["Supabase Auth"]
  end

  subgraph DB["Supabase Postgres"]
    T1[(experts)]
    T2[(categories)]
    T3[(expert_categories)]
    T4[(admin_users)]
    T5[(audit_log)]
    T6[(requests · likes)]
  end

  HOME --> CLS --> GM --> GEM
  RESULT --> EXP --> REPO
  BROWSE --> EXP
  DETAIL --> REPO
  REPO -->|GOLGORU_DATA_SOURCE| SREPO & MREPO
  SREPO --> T1 & T3
  ADMIN --> AAPI --> GRD --> SBA
  GRD --> T4
  AAPI --> CSV
  AAPI --> T1 & T2 & T3
  AAPI --> AUD --> T5
```

---

## 2. F1 — SOS 텍스트 분류 (입력 → 분야·카테고리·긴급도)

핵심 설계: **Gemini 우선, 장애 시 로컬 키워드 룰 폴백** — 분류는 절대 죽지 않는다.

```mermaid
sequenceDiagram
  autonumber
  actor U as 사용자
  participant SI as SosInput.tsx
  participant SS as sessionStorage
  participant CLS as /api/classify (POST)
  participant GM as lib/gemini.ts
  participant GEM as Gemini 2.5-flash-lite

  U->>SI: 텍스트 입력 → [전문가 찾기]
  SI->>CLS: POST {query} (JSON)
  CLS->>CLS: 검증 (2자 미만 → 400)
  CLS->>GM: classifyQuery(query)

  alt GEMINI_API_KEY 없음
    GM->>GM: localClassify(query) — RULES 키워드 매칭
  else 키 있음
    GM->>GEM: generateContent(CLASSIFY_PROMPT, thinkingBudget:0)
    alt 정상 응답
      GEM-->>GM: JSON {vertical, category_code, urgency, keywords, summary}
    else 429/503/500
      GM->>GM: localClassify(query) 폴백
    end
  end

  GM-->>CLS: ClassifyResult
  CLS-->>SI: 200 ClassifyResult
  SI->>SS: classifyResult·sosQuery 저장,<br/>recommendedExperts 삭제(새 검색)
  SI->>U: router.push('/result?q=...')
```

**오류 경로**: 분류 실패(throw) → 500 → SosInput이 "잠시 후 다시 시도해주세요" 표시.

---

## 3. F2 — 음성 입력 (브라우저별 이중 경로)

```mermaid
sequenceDiagram
  autonumber
  actor U as 사용자
  participant SI as SosInput.tsx
  participant WS as Web Speech API
  participant REC as useAudioRecorder + encodeWav
  participant CLS as /api/classify (POST)
  participant GM as lib/gemini.ts
  participant GEM as Gemini 2.5-flash

  U->>SI: 🎤 탭
  alt Web Speech 지원 (Chrome/Android)
    SI->>WS: startSpeech() — lang=ko-KR, interim
    WS-->>SI: onresult 실시간 텍스트
    SI->>SI: textarea 반영 → 이후 F1 텍스트 경로
  else 미지원 (iOS Safari)
    SI->>REC: startRecording() (MediaRecorder)
    U->>SI: 탭해서 중단
    SI->>REC: stopRecording() → encodeWav(blob)
    SI->>CLS: POST FormData{audio.wav}
    CLS->>CLS: 크기 검증 (0 → 400, >2.5MB → 413)
    CLS->>GM: classifyAudio(base64, 'audio/wav')
    Note over GM,GEM: 받아쓰기+분류 1콜 (로컬 폴백 불가)
    GM->>GEM: generateContent(audio + AUDIO_CLASSIFY_PROMPT)
    GEM-->>GM: {transcript, vertical, ...}
    GM-->>CLS: ClassifyResult(+transcript)
    CLS-->>SI: 200
    SI->>SI: setQuery(transcript) → 사용자 확인 후 F1 진행
  end
```

**오류 경로**: 키 없음 → `GeminiConfigError` → 503 "텍스트로 입력해주세요" / 무음 → 422 "다시 시도".

---

## 4. F3 — 전문가 3인 랜덤 추천 (+ 캐시·재추천)

핵심 설계: **카테고리 코드 우선 매칭 → 0명이면 vertical 폴백 → 셔플 3인**. 뒤로가기는 캐시 복원(같은 3인), "새로 추천"만 재셔플.

```mermaid
sequenceDiagram
  autonumber
  actor U as 사용자
  participant RP as result/page.tsx
  participant SS as sessionStorage
  participant EXP as /api/experts (GET)
  participant REPO as supabase-repository.ts
  participant DB as Postgres

  U->>RP: /result 진입
  RP->>SS: classifyResult 읽기 (없으면 / 로 replace)

  alt 캐시 있음 (뒤로가기 복귀)
    RP->>SS: recommendedExperts 복원
    RP-->>U: 같은 3인 즉시 표시 (재조회·재셔플 없음)
  else 캐시 없음 (신규 진입)
    RP->>EXP: GET ?vertical&urgency&category
    EXP->>REPO: listRecommended({vertical, urgency, categoryCode})
    opt categoryCode 있음
      REPO->>DB: expert_categories where category_code → expert_id[]
      Note over REPO: 매칭 1명 이상일 때만 .in(id) 좁힘<br/>0명 → vertical 전체로 자동 폴백
    end
    REPO->>DB: experts where vertical & is_active
    DB-->>REPO: 후보 풀
    opt urgency = '즉시'
      REPO->>REPO: status='available' 필터 (있을 때만)
    end
    REPO->>REPO: shuffleExperts() → slice(0,3)
    REPO-->>EXP: Expert[3]
    EXP-->>RP: {experts}
    RP->>SS: recommendedExperts 캐시
    RP-->>U: 분석 애니메이션 후 3인 카드
  end

  opt [새로 추천] 클릭
    RP->>SS: recommendedExperts 삭제
    RP->>EXP: 재조회 → 새 셔플 3인
  end
```

---

## 5. F4 — 미니홈피 (`/expert/[id]`) 진입 맥락 분기

한 페이지가 3가지 진입 맥락을 처리한다. 뒤로가기 라벨 = **돌아갈 목적지**.

```mermaid
sequenceDiagram
  autonumber
  actor U as 사용자
  participant DP as expert/[id]/page.tsx (RSC)
  participant REPO as repository.findById()
  participant DB as Postgres

  U->>DP: 진입 (3경로)
  Note over U,DP: ① /result 카드 → ?from=result<br/>② 둘러보기 카드 → ?back=/experts?vertical=...<br/>③ 직접/공유 링크 → 쿼리 없음
  DP->>DP: searchParams 해석<br/>inFlow = from==='result'<br/>fromBrowse = back이 /experts 시작
  DP->>REPO: findById(id)
  REPO->>DB: experts where id & is_active
  DB-->>DP: Expert (없으면 notFound 404)
  DP-->>U: 렌더 — 직함 expertTitle() (license 우선)
  Note over DP,U: 헤더: ①「< 추천 결과」+ 3/3 ②「< 전문가 목록」(back 복귀, 필터 보존) ③「< 홈」
  U->>U: [전화 연결] tel: (CallButton, expertCallLabel)
```

---

## 6. F5 — 전문가 둘러보기 (필터 + 커서 무한 스크롤)

핵심 설계: **선택 전 조회 없음 → 첫 페이지 SSR → 하단 도달 시 커서 append**. 정렬은 중립 키 — 디렉터리에 서열 의미 부여 금지.

```mermaid
sequenceDiagram
  autonumber
  actor U as 사용자
  participant BP as experts/page.tsx (RSC)
  participant BL as ExpertBrowseList.tsx (client)
  participant API as /api/experts/browse (GET)
  participant REPO as supabase-repository.listBrowse()
  participant DB as Postgres

  U->>BP: /experts 진입 (쿼리 없음)
  BP-->>U: 필터 칩만 렌더 — "분야를 선택하면…" (조회 0회)

  U->>BP: 칩 선택 (?all=1 | ?vertical=tax | +category=TAX-01)
  opt vertical 선택 시
    BP->>DB: categories where vertical & level=1 (2차 필터 칩)
  end
  BP->>REPO: listBrowse({vertical, categoryCode}) — 1페이지 SSR
  REPO->>DB: experts order by (status,name,id) limit 21
  Note over REPO: status 오름차순 = available 우선<br/>limit+1로 다음 페이지 유무 판단
  REPO-->>BP: {experts[20], nextCursor(base64)}
  BP-->>U: 첫 20명 + 칩 active 표시

  loop 스크롤 하단 200px 도달 (IntersectionObserver)
    BL->>API: GET ?vertical&category&cursor
    API->>REPO: listBrowse({cursor})
    REPO->>REPO: decodeCursor → keyset 조건<br/>or(status.gt, and(eq,name.gt), and(eq,eq,id.gt))
    REPO->>DB: 다음 21건
    REPO-->>BL: {experts, nextCursor|null}
    BL-->>U: append (nextCursor null → "마지막입니다")
  end

  U->>U: 카드 클릭 → /expert/[id]?back=… (F4 ②경로)
```

---

## 7. F6 — 어드민 로그인 + API 가드 (공통 관문)

모든 `/api/admin/*` 요청은 `requireAdmin()`을 통과한다. 실패 양상까지 감사로그에 남는다.

```mermaid
sequenceDiagram
  autonumber
  actor A as 관리자
  participant LP as /admin/login (UI)
  participant AUTH as /api/admin/auth/login (POST)
  participant SBA as Supabase Auth
  participant DB as Postgres
  participant ANY as /api/admin/* (이후 모든 요청)
  participant GRD as requireAdmin()

  A->>LP: 이메일+비밀번호
  LP->>AUTH: POST {email, password}
  AUTH->>SBA: signInWithPassword
  alt 인증 실패
    AUTH->>DB: audit_log insert (auth.login.fail)
    AUTH-->>LP: 401
  else 인증 OK
    AUTH->>DB: admin_users where id
    alt 미등록 (어드민 아님)
      AUTH->>SBA: signOut (세션 즉시 폐기)
      AUTH->>DB: audit_log (fail: not an admin)
      AUTH-->>LP: 403
    else 등록됨
      AUTH->>DB: audit_log (auth.login.success)
      AUTH-->>LP: 200 {role} → /admin 이동 (세션 쿠키)
    end
  end

  Note over ANY,GRD: ── 이후 모든 어드민 API 공통 ──
  ANY->>GRD: requireAdmin(minRole)
  GRD->>SBA: auth.getUser() (쿠키 세션)
  GRD->>DB: admin_users role 조회
  alt 미인증 → 401 / super_admin 필요한데 operator → 403
    GRD-->>ANY: {response} 즉시 반환
  else 통과
    GRD-->>ANY: {identity} → 본 로직 실행
  end
```

---

## 8. F7 — 전문가 CRUD + 카테고리 동기화 (어드민)

핵심 설계: `experts` 본체와 `expert_categories` 링크는 **전삭제-재삽입(syncCategories)** 으로 동기화. 모든 변이는 감사로그.

```mermaid
sequenceDiagram
  autonumber
  actor A as 관리자
  participant UI as admin/page.tsx + ExpertForm.tsx
  participant API as /api/admin/experts (·/[id])
  participant GRD as requireAdmin()
  participant DB as Postgres

  Note over UI: 폼: license(자격)·status·운영시간·카테고리 칩(level1)

  A->>UI: 저장 (신규 POST / 수정 PUT)
  UI->>API: payload {…, license, category_codes[]}
  API->>GRD: 가드 (F6 공통)
  alt POST 신규
    API->>DB: experts insert (license 포함)
  else PUT 수정
    API->>DB: experts update where id
  end
  opt category_codes 가 배열일 때만
    API->>DB: expert_categories delete where expert_id
    API->>DB: expert_categories insert (중복 제거 후)
  end
  API->>DB: audit_log (expert.create | expert.update)
  API-->>UI: 200 → 목록 재조회

  Note over A,DB: 기타: PATCH is_active(노출 토글, expert.deactivate)<br/>DELETE는 super_admin 전용 (expert.delete)
  Note over UI,DB: 목록 GET: experts + expert_categories 조인<br/>→ category_codes 평탄화, 직업칼럼 '세무사'
```

---

## 9. F8 — CSV 일괄 등록 (validate → commit 2단계)

핵심 설계: **검증과 반영 분리**. 한글 헤더/값 별칭 흡수, 부분 성공 허용(중복 전화는 건너뜀).

```mermaid
sequenceDiagram
  autonumber
  actor A as 관리자
  participant UI as admin/import (UI)
  participant API as /api/admin/experts/import (POST)
  participant CSV as parseExpertsCsv()
  participant DB as Postgres

  A->>UI: 템플릿 다운로드 (buildTemplateCsv — BOM+한글헤더+예시 2행)
  A->>UI: CSV 업로드
  UI->>API: POST ?mode=validate (FormData)
  API->>CSV: parseExpertsCsv(text)
  Note over CSV: BOM 제거 → 헤더 별칭(직업/자격/카테고리코드…)<br/>→ zod 행 검증 (변호사→lawyer, 세무사/세무→tax,<br/>가능→available, 파일 내 전화 중복)
  CSV-->>API: {valid[], errors[], duplicates}
  API-->>UI: 미리보기 20행 + 오류 목록 (행번호·필드·사유)

  A->>UI: [등록 실행]
  UI->>API: POST ?mode=commit
  API->>CSV: 재파싱
  API->>DB: experts where phone in (…) — DB 기존 중복 조회
  API->>API: 중복 전화 제외 (skippedExisting)
  API->>DB: experts 일괄 insert (license 포함)
  API->>DB: categories 전체 코드 조회 → 존재하는 코드만
  API->>DB: expert_categories 일괄 insert (categoriesLinked)
  API->>DB: audit_log (expert.import: total·inserted·skipped)
  API-->>UI: 결과 요약 (inserted / skipped / rowErrors)
```

---

## 10. F9 — 카테고리 관리 (어드민)

```mermaid
sequenceDiagram
  autonumber
  actor A as 관리자
  participant UI as admin/categories/page.tsx
  participant API as /api/admin/categories (·/[code])
  participant DB as Postgres

  A->>UI: 직업 탭 선택
  UI->>API: GET ?all=1 (비활성 포함)
  API->>DB: categories order by code
  DB-->>UI: 코드·라벨·레벨·활성 목록 (코드 복사 버튼)

  alt 라벨 수정 / 활성 토글
    UI->>API: PATCH /[code] {label | is_active}
    API->>DB: categories update
    Note over DB: 비활성 = 신규 입력 차단,<br/>기존 expert_categories 링크는 유지
  else 신규 코드 추가
    UI->>API: POST {code, label, vertical, level, parent_code}
    API->>API: 형식 검증 ^[A-Z]{3}-\d{2}(-\d{2})?$ · 중복 23505
    API->>DB: categories insert
  end
  API->>DB: audit_log (category.create | category.update)
  Note over UI: 이 화면이 ExpertForm 칩·CSV 카테고리코드 칼럼의 참조 원장
```

---

## 11. (예정) F10 — 소셜 로그인 · 3역할

일반유저·전문가·관리자 역할 분리와 Google/Kakao OAuth 플로우는 별도 설계 문서 참조:
→ **[auth-social-login.design.md](features/auth-social-login.design.md)** (§2 공통 로그인, §3 보호 액션, §4 전문가 승인, §5 관리자)

---

## 12. 모듈-파일 매핑 (미션별 업무 분해 기준표)

| 기능 | 화면(클라이언트) | API 라우트 | 핵심 로직(lib) | DB 테이블 |
|---|---|---|---|---|
| F1 텍스트 분류 | `components/SosInput.tsx` | `app/api/classify/route.ts` | `lib/gemini.ts` (classifyQuery·localClassify·RULES) | — |
| F2 음성 입력 | `components/SosInput.tsx` | 〃 | `lib/gemini.ts` (classifyAudio), `lib/audio/*` | — |
| F3 3인 추천 | `app/(site)/result/page.tsx` | `app/api/experts/route.ts` | `lib/experts/*-repository.ts` (listRecommended) | experts, expert_categories |
| F4 미니홈피 | `app/(site)/expert/[id]/page.tsx`, `CallButton.tsx` | — (RSC 직접 조회) | repository (findById), `lib/constants.ts` (expertTitle) | experts |
| F5 둘러보기 | `app/(site)/experts/page.tsx`, `ExpertBrowseList.tsx`, `ExpertCard.tsx` | `app/api/experts/browse/route.ts` | repository (listBrowse, 커서 인코딩) | experts, expert_categories, categories |
| F6 어드민 인증 | `app/(admin)/admin/login/*` | `app/api/admin/auth/*` | `lib/admin/auth.ts` (requireAdmin), `supabaseServer.ts` | admin_users, audit_log |
| F7 전문가 CRUD | `app/(admin)/admin/page.tsx`, `ExpertForm.tsx` | `app/api/admin/experts/route.ts`, `[id]/route.ts` | `lib/admin/audit.ts` | experts, expert_categories, audit_log |
| F8 CSV 등록 | `app/(admin)/admin/import/*` | `app/api/admin/experts/import/route.ts`, `template/route.ts` | `lib/admin/csv.ts` | experts, expert_categories, categories, audit_log |
| F9 카테고리 | `app/(admin)/admin/categories/page.tsx` | `app/api/admin/categories/*` | — | categories, audit_log |
| 공통 | `lib/tokens.ts`(디자인), `lib/constants.ts`(라벨) | — | `lib/types.ts`, `lib/supabase.ts`, `lib/experts/data-source.ts` | — |

### 미션 분해 가이드

- **소비자 UI 미션** → F1~F5 행의 화면 칼럼만. API 계약(`ClassifyResult`, `{experts, nextCursor}`)이 경계.
- **추천·검색 로직 미션** → repository 칼럼만. `ExpertRepository` 인터페이스가 경계 — mock/supabase 동시 수정 필수.
- **어드민 미션** → F6~F9. 모든 변이에 `requireAdmin` 가드 + `logAudit` 호출이 규약.
- **분류 품질 미션** → `lib/gemini.ts` 단독 (CLASSIFY_PROMPT·CATEGORY_GUIDE·RULES). 카테고리 추가 시 F9 화면과 `CATEGORY_GUIDE` 동기화 필요.
- **스키마 미션** → 루트 `supabase-*.sql` + `lib/types.ts` + SELECT 상수 3곳(공개 repo·admin 2 라우트) 동시 변경 — license 추가 때와 동일 패턴.
