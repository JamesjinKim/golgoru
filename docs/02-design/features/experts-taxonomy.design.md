---
template: design
version: 0.1
feature: experts-taxonomy
date: 2026-06-09
author: Kim KJ
project: golgoru-sos
version_project: 0.1.0
status: Draft — 검토용 (구현 전)
---

# experts-taxonomy Design Document (직업 중심 카테고리 정규화)

> **Summary**: 전문가 전문분야를 자유 텍스트(`specialties text[]`)에서 **정규화된 계층 카테고리 코드**로 전환한다. 직업(7개)을 최상위 축으로 유지하고, 각 직업 밑에 계층 카테고리를 둔다. 전문가↔카테고리는 **score 없는 다대다 조인**이며 추천은 매칭군 내 랜덤. MVP로 만들되 스키마는 Phase 2(데이터 플라이휠) 모양으로 미리 잡는다.
>
> **Status**: Draft — 본 문서는 **검토용 초안**. 확정 후 [experts-schema.design.md](experts-schema.design.md)를 잇는 구현으로 진행.
> **상위**: [golgoru-sos.plan.md](../../01-plan/features/golgoru-sos.plan.md), [experts-schema.design.md](experts-schema.design.md)

---

## 1. 확정 결정 (2026-06-09)

| # | 결정 |
|---|---|
| D1 | **직업 중심 유지** — 최상위 축 = 직업 (`experts.vertical`) |
| D2 | **전문가 직업 7개** — 변호사·의사·노무사·변리사·세무사·손해사정사·감정평가사 (**회계사 제외**, 세무사가 세무 영역 담당) |
| D3 | **카테고리 정규화** — 직업별 계층 코드(`categories`) + 다대다 조인(`expert_categories`) |
| D4 | **`score` 없음** — 랜덤 추천 원칙 유지([[expert-recommendation-random]]). 조인은 "이 전문가가 이 카테고리를 다룬다"는 매칭용 태깅만 |
| D5 | **MVP 클린 분리** — 변호사 트리에서 노동→노무사, 세무→세무사로 분리. 직업 간 모호함은 차후 AI 의미 판단 |
| D6 | **남은 중복** — 의료소송은 변호사 유지(의사=건강상담과 다름), 특허·상표는 변리사로 이관 |

## 2. 스키마 (Phase 2 대비, score 없음)

```sql
-- 카테고리 마스터 (직업별 자기참조 계층)
create table categories (
  code         text primary key,         -- 'LAW-01' / 'LAW-01-01' / 'TAX-02-01'
  parent_code  text references categories(code),
  vertical     text not null,            -- 소속 직업 (7개 중 하나, experts.vertical 과 동일 도메인)
  level        int  not null,            -- 1 중분류 / 2 세부
  label        text not null,
  is_active    boolean not null default true
);
create index categories_vertical_idx on categories (vertical);

-- 전문가 ↔ 카테고리 (다대다, score 없음)
create table expert_categories (
  expert_id     uuid references experts(id) on delete cascade,
  category_code text references categories(code),
  primary key (expert_id, category_code)
);
```

- `experts.vertical`(직업 1개)은 유지. 세부 매칭은 `expert_categories`로.
- 기존 `experts.specialties text[]`는 **표시·폴백용으로 병행 유지** → 점진 이관(코드 트리 미정의 직업은 당분간 텍스트).
- 카테고리 최상위(직업 자체)는 별도 행 없이 `experts.vertical` + 코드 prefix로 표현.

## 3. 직업 ↔ 코드 prefix 매핑

| vertical | 직업 | prefix | 트리 상태 |
|---|---|---|---|
| lawyer | 변호사 | `LAW` | ✅ 확정(정리본) |
| adjuster | 손해사정사 | `INS` | ✅ 확정(제공본) |
| tax | 세무사 | `TAX` | ✅ 확정(제공본) |
| labor | 노무사 | `LAB` | 🟡 초안 |
| patent | 변리사 | `PAT` | 🟡 초안 |
| doctor | 의사 | `MED` | 🟡 초안 |
| appraiser | 감정평가사 | `APR` | 🟡 초안 |

> ✅ = 사용자 제공/확정, 🟡 = 본 문서 초안(검토 필요)

---

## 4. 직업별 카테고리 트리

### 4.1 변호사 (LAW) ✅ — 노동·세무·특허/상표 분리한 정리본

| 코드 | 중분류 | 세부 |
|---------|----|------------------------------------------------------------------------------------------|
| LAW-01 | 형사 | 성범죄 · 교통사고·음주운전 · 명예훼손·모욕 · 재산범죄 · 일반형사 · 마약 · 스토킹 · 폭행·상해 |
| LAW-02 | 민사·계약 | 대여금 · 미수금 · 일반계약 · 손해배상 · 채권추심 · 가압류·가처분 · 강제집행 |
| LAW-03 | 부동산·임대차 | 부동산매매 · 소유권분쟁 · 명도 · 재개발·재건축 · 건물하자 · 임대차계약 · 보증금 · 권리금 |
| LAW-04 | 가사 | 이혼 · 상간자소송 · 양육비 · 친권·양육권 · 상속 · 유류분 · 상속포기 · 유언 |
| LAW-05 | 기업법무 | 기업자문 · 영업비밀 · 경영권분쟁 · 투자계약 |
| LAW-06 | 행정 | 행정소송 · 인허가 |
| LAW-07 | 의료 | 의료사고 · 의료분쟁 · 의약품분쟁 *(의료소송 — 변호사 영역)* |
| LAW-08 | IT·지식재산 | 저작권 · 개인정보 · 콘텐츠분쟁 *(특허·상표는 변리사로 이관)* |
| LAW-09 | 기타 | 개인회생 · 개인파산 · 법인회생 · 법인파산 · 소비자분쟁 · 계약서검토 · 군형법 · 헌법 |

**제거/이관 내역(원본 대비)**: ~~노동~~→노무사(LAB), ~~세금(조세·상속세·증여세)~~→세무사(TAX), ~~특허·상표~~→변리사(PAT). 행정·의료소송은 변호사 고유로 유지.

### 4.2 손해사정사 (INS) ✅ — 제공본

| 코드 | 중분류 | 세부 |
|---|---|---|
| INS-01 | 보험금 청구 | 실손 · 질병 · 상해 · 생명 · 치아 · 어린이 · 태아 |
| INS-02 | 자동차 | 대인 · 대물 · 렌트카사고 · 음주사고 보험분쟁 |
| INS-03 | 재산 | 화재 · 침수 · 도난 · 재난피해 |
| INS-04 | 배상책임 | 일반배상책임 · 영업배상책임 · 제조물배상책임 |
| INS-05 | 특수보험 | 근로재해 · 학교안전사고 · 여행자 · 골프 · 연금 |

### 4.3 세무사 (TAX) ✅ — 제공본

| 코드 | 중분류 | 세부 |
|---|---|---|
| TAX-01 | 기장 | — |
| TAX-02 | 재산제세 | 양도 · 상속 · 증여 |
| TAX-03 | 조사불복 | 세무조사 대응 |
| TAX-04 | 컨설팅 | 가지급금 해결 · 이익소각 등 |

### 4.4 노무사 (LAB) 🟡 — 초안 (변호사에서 분리한 노동 영역)

| 코드 | 세부 |
|---|---|
| LAB-01 | 부당해고 |
| LAB-02 | 임금체불 |
| LAB-03 | 퇴직금 |
| LAB-04 | 징계 |
| LAB-05 | 직장 내 괴롭힘 |
| LAB-06 | 산업재해 |

### 4.5 변리사 (PAT) 🟡 — 초안 (변호사에서 분리한 특허·상표 포함)

| 코드 | 세부 |
|---|---|
| PAT-01 | 특허 (출원·침해·분쟁) |
| PAT-02 | 상표 (출원·분쟁) |
| PAT-03 | 디자인 |
| PAT-04 | 실용신안 |
| PAT-05 | 해외출원·PCT |

### 4.6 의사 (MED) 🟡 — 초안 (건강상담 중심, 소송 아님)

| 코드 | 세부 |
|---|---|
| MED-01 | 응급·급성 증상 |
| MED-02 | 내과·만성질환 |
| MED-03 | 정신건강 |
| MED-04 | 건강검진·예방 |
| MED-05 | 진료과 안내·세컨드 오피니언 |

### 4.7 감정평가사 (APR) 🟡 — 초안

| 코드 | 세부 |
|---|---|
| APR-01 | 부동산 감정평가 |
| APR-02 | 토지보상·수용 |
| APR-03 | 경매·담보 감정 |
| APR-04 | 자산·동산 평가 |

---

## 5. AI 분류 영향

- 현재: Gemini가 `vertical` 1개 추론.
- 전환: **vertical + (옵션) category_code** 동시 추론. category_code 있으면 정밀 매칭, 없으면 vertical 폴백.
- 직업 간 모호 문제(예: "임금체불" → 노무사 vs 변호사)는 **AI 의미 판단**에 위임(D5). MVP는 클린 분리로 1차 라우팅, 향후 교차 매칭은 Phase 2.
- 프롬프트에 직업 7개 + 각 직업 카테고리 라벨 제공. leaf까지 강제하지 않고 "가장 맞는 카테고리 코드"를 선택하도록.

## 6. 회계사 제거 영향 (구현 시 처리)

- `Vertical` 타입·`experts_vertical_check`·`VERTICAL_LABEL`/`CALL_LABEL`·CSV `VERTICALS`·ExpertForm·`gemini.ts`(프롬프트+로컬규칙)에서 `accountant` 삭제 → **7개**
- 시드 데이터: `delete from experts where vertical='accountant'` (10명 → 총 70명)
- 메인 페이지 예시 "회계" 칩 제거

## 7. 범위 (MVP vs Phase 2)

| 지금 (MVP)                            | Phase 2                                           |
|---------------------------------------|---------------------------------------------------|
| `categories`·`expert_categories` 생성 | leaf 단위 정밀 AI 라우팅 전면화 |
| 7직업 트리 시드(✅ 3직업 확정 + 🟡 4직업 초안 확정 후) | 교차 직업 매칭(AI 판단) 고도화 |
| 회계사 제거 + 시드 70명 재구성          | score/플라이휠(원칙 재검토 후) |
| AI: vertical + optional category_code | category 우선 매칭 |
| `specialties text[]` 병행(폴백)       | text[] 완전 폐기 |

## 8. 구현 체크리스트 (확정 후 착수)

- [ ] 🟡 4직업 트리(노무사·변리사·의사·감정평가사) 초안 검토·확정
- [ ] `Vertical` 7개로 축소(accountant 제거) — 타입·제약·라벨·CSV·폼·gemini
- [ ] `categories` / `expert_categories` 테이블 SQL(재실행 안전)
- [ ] 카테고리 시드(7직업 트리)
- [ ] 시드 전문가 70명 재구성 + `expert_categories` 태깅(직업별 1~3개)
- [ ] `gemini.ts` 프롬프트에 카테고리 추론 추가(vertical + category_code)
- [ ] 매칭 로직: category_code 우선 → 없으면 vertical 폴백, 매칭군 내 랜덤
- [ ] 메인 예시 칩 / 어드민 폼 카테고리 입력 UI

## Version History
| Version | Date | Changes | Author |
|---|---|---|---|
| 0.1 | 2026-06-09 | 초안 — 7직업 카테고리 트리 + 정규화 스키마(score 없음) 설계 | Kim KJ |
