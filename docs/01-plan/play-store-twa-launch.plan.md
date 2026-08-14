# 골고루 SOS — 구글 플레이스토어 하이브리드 앱 출시 기획

> 작성일 2026-08-04 · 방식 확정: **TWA(Bubblewrap)** · 1차 타깃 **안드로이드 단독** · **음성 녹음 필수**

## 0. 한 줄 요약

지금 서비스 중인 웹앱(`golgoru-sos.vercel.app`)을 **코드 거의 그대로** 안드로이드 앱으로 감싸(TWA) 플레이스토어에 올린다. 별도 앱을 새로 만드는 게 아니라, **웹 = 앱**이 되므로 유지보수 지점이 한 곳으로 유지된다. 핵심 관문은 세 가지: ① 신뢰 링크(Digital Asset Links) ② 마이크 권한 ③ 카카오 로그인 커스텀탭.

---

## 1. TWA가 우리에게 맞는 이유 (의사결정 근거)

| 항목 | TWA 선택 시 |
|---|---|
| 코드 변경 | 거의 없음. Vercel에 배포된 웹이 그대로 앱 화면 |
| 음성 녹음(getUserMedia) | Chrome 엔진 그대로 → **웹에서 되면 앱에서도 됨** (권한만 처리) |
| 전화 연결(`tel:`) | OS 다이얼러로 그대로 넘어감. 추가 작업 없음 |
| 카카오·구글 로그인 | 웹 OAuth 그대로. 단, 커스텀탭 처리 필요(§4) |
| Supabase/Gemini | 서버 그대로. 앱은 껍데기라 백엔드 무관 |
| 유지보수 | 웹 배포 1회 = 앱도 즉시 갱신 (스토어 재심사 불필요) |
| 한계 | **안드로이드 전용** (iOS 불가 → 나중에 Capacitor 검토) |

> 이미 있는 것: `public/manifest.json`(PWA 매니페스트), `lib/auth/inAppBrowser.ts`(인앱브라우저 대응 이력). TWA 전환의 절반은 이미 되어 있는 셈.

---

## 2. 진행 단계 (Phase)

### Phase 1 — 웹을 "설치 가능한 PWA"로 완성 (앱화 전제조건)
TWA는 **PWA 품질 기준(Lighthouse PWA)** 을 통과해야 신뢰 링크가 붙는다.

- [ ] `manifest.json` 보강: 현재 필드는 최소한. **아이콘(192·512px, maskable 포함)** 추가 필요 — 지금 없음
- [ ] `app/layout.tsx` **metadata에 manifest 연결** (현재 미연결로 확인됨)
  - `metadata.manifest`, `themeColor`, `appleWebApp`, viewport 설정
- [ ] 아이콘/스플래시 자산 제작: 512px 원본에서 파생 (기존 `moonsiklee.png`는 용도 다름 — 앱 아이콘 별도 필요)
- [ ] Lighthouse PWA 감사 통과 확인 (`installable` 판정)

산출물: 설치 가능한 PWA. **이 단계까지는 순수 웹 작업이라 리스크 최저.**

### Phase 2 — Digital Asset Links (신뢰 링크) ⚠️ 핵심 관문
앱과 도메인이 "같은 소유자"임을 증명해야 주소창·전체화면이 깨끗하게 뜬다. 실패하면 앱 상단에 URL 바가 남아 "웹뷰 티"가 난다.

- [ ] **도메인: 기존 `golgoru-sos.vercel.app` 그대로 사용** (확정 2026-08-04)
  - 카카오/구글 OAuth·Supabase Auth **재등록 불필요** — 이미 등록된 도메인이라 로그인 무손상
  - assetlinks·Bubblewrap도 이 도메인 기준으로 진행
  - 커스텀 도메인(`app.golgoru.co.kr`)은 **후속 과제** — 나중에 도메인만 교체 가능(그때 콘솔 3곳 URI 추가)
- [ ] 서명키(keystore) 생성 → **SHA-256 지문** 추출
- [ ] `/.well-known/assetlinks.json` 을 **웹 루트에 배포** (Next.js는 `public/.well-known/assetlinks.json` 또는 라우트로)
- [ ] 지문·패키지명 일치 검증

> ⚠️ **서명키(keystore) 분실 = 앱 업데이트 영구 불가.** 생성 즉시 안전하게 백업(비밀번호 포함). 이게 이 프로젝트에서 가장 되돌리기 어려운 지점.

### Phase 3 — Bubblewrap으로 앱 빌드
- [ ] `@bubblewrap/cli` 설치 → `bubblewrap init --manifest <manifest-url>`
- [ ] 패키지명 확정 (예: `kr.co.golgoru.sos` — 역도메인, 변경 불가)
- [ ] **마이크 권한 명시**: TWA는 기본적으로 위험 권한을 자동 요청 안 함. Android 매니페스트에 `RECORD_AUDIO` 추가 + Chrome 권한 위임(delegation) 설정 필요 → **음성 녹음이 필수이므로 이 단계 반드시 검증**
- [ ] `bubblewrap build` → **AAB**(플레이스토어 제출용) + APK(테스트용) 생성
- [ ] 실기기에서 마이크·전화·로그인 3종 동작 확인

### Phase 4 — 로그인 커스텀탭 검증 ⚠️
카카오/구글 OAuth가 TWA 안에서 **인앱 웹뷰로 뜨면 구글 정책상 로그인 차단**된다. Custom Tabs로 열려야 한다.

- [ ] TWA 환경에서 카카오·구글 로그인 실제 플로우 테스트
- [ ] 리디렉트 URI에 앱 컨텍스트 반영 여부 확인
- [ ] 기존 `lib/auth/inAppBrowser.ts` 로직이 TWA에서도 유효한지 점검
- [ ] (도메인 기존 유지 결정으로 **리디렉트 URI 재등록 불필요** — 이미 등록됨)

> 로그인은 이미 프로덕션 동작 중 + 도메인도 그대로라 **코드·콘솔 모두 무손상**. 남은 건 오직 **"TWA 안에서 카카오/구글이 Custom Tabs로 뜨는지"** 실기기 확인 1가지.

### Phase 5 — 플레이 콘솔 등록 & 심사
- [ ] Google Play 개발자 계정 등록 (**1회 $25**, 심사에 신원확인·주소 필요 → 개인/법인 결정)
- [ ] 스토어 등록정보: 앱명, 짧은/긴 설명, **스크린샷(폰 최소 2장)**, 512px 아이콘, 1024×500 그래픽
- [ ] **개인정보처리방침 URL** (필수) — 이미 `/terms/*` 페이지 있음, 이걸 연결
- [ ] **데이터 안전(Data Safety) 양식**: 마이크(음성)·위치·전화번호·이메일 수집 항목 정직하게 신고 → 우리는 음성/프로필 수집하므로 꼼꼼히
- [ ] 마이크 권한 사용 사유 설명 (심사 반려 흔한 지점)
- [ ] **비공개 테스트 → 프로덕션** 순서로 출시 (신규 개인계정은 프로덕션 전 테스터 확보 요구될 수 있음)

---

## 3. 리스크 & 흔한 반려 사유

| 리스크 | 영향 | 대응 |
|---|---|---|
| **keystore 분실** | 업데이트 영구 불가 | 생성 즉시 백업, Play App Signing 활용 |
| assetlinks 불일치 | 주소창 남음(웹뷰 티) | SHA-256 지문·패키지명 재확인 |
| 마이크 권한 미위임 | 핵심 기능 불능 | Phase 3에서 실기기 검증 필수 |
| OAuth 인앱웹뷰 차단 | 로그인 불가 | Custom Tabs 확인(Phase 4) |
| Data Safety 부실 신고 | 심사 반려 | 음성·프로필 수집 정직 신고 |
| 개인정보처리방침 누락 | 등록 불가 | 기존 `/terms` 연결 |

---

## 4. 예상 일정 · 비용

| 구분 | 예상 |
|---|---|
| 개발 작업(Phase 1~4) | 약 1~2주 (기존 웹 완성도 높아 짧음) |
| 심사 대기 | 신규 계정 수일~2주 (Google 정책상 변동) |
| 개발자 등록비 | **$25 1회** (안드로이드) |
| 커스텀 도메인 | 이미 있으면 $0 |
| **합계 초기비용** | **약 $25 + 도메인** |

---

## 5. 확정된 결정 (2026-08-04)

1. **도메인**: ✅ **기존 `golgoru-sos.vercel.app` 그대로 사용** (로그인 재등록 불필요·저리스크). 커스텀 `app.golgoru.co.kr`은 후속 과제로 미룸
2. **패키지명**: ✅ **`kr.co.golgoru.sos`** 확정 — 변경 불가
3. **개발자 계정 주체**: ✅ **개발자 개인 계정** 확정 (2026-08-14)
   - 게시자명은 개인 실명 기반 인증 필요(2023년 이후 Google 정책). 표시명은 사후 변경 가능하나 계정 소유권은 개인에 귀속.
   - **주의사항(골고루팀 공유 필요)**: 앱이 개발자 개인 명의로 등록됨. 향후 법인 이관을 원하면 **app transfer**(복잡·불확실) 별도 절차. 개인정보처리방침·데이터안전 신고의 책임 주체도 개인 계정과 연결됨을 팀과 사전 합의.
   - 비공개 테스트 단계에는 문제 없음. 프로덕션 정식 전환 전 이 귀속 문제를 골고루팀과 한 번 더 확인 권장.
4. **출시 범위**: ✅ **비공개 테스트(Closed Testing)부터** 시작

---

## 6. 다음 액션 (승인 시 착수 순서)

1. `manifest.json` 아이콘 보강 + `layout.tsx` metadata 연결 (순수 웹, 저리스크)
2. 앱 아이콘/스플래시 자산 제작
3. Lighthouse PWA 통과 확인
4. → 그 다음 keystore·assetlinks·Bubblewrap (스토어 준비물 갖춰진 뒤)

---

## 7. 툴별 실행 플랜 (What tool, how) — 2026-08-14 확정

> 골고루팀 공식 요청으로 착수. 아래는 "어떤 툴로 어떤 명령을 어떤 순서로" 돌리는 실행 대본.
> **로컬 사전점검 결과(2026-08-14)**: Node v26 ✅ / npm ✅ / **JDK 없음 ❌**(Bubblewrap 전제) / bubblewrap 미설치 / `public/.well-known` 없음 / 앱아이콘 PNG 없음 / `layout.tsx`에 manifest 미연결.

### 사용 툴 스택

| 목적 | 툴 | 비고 |
|---|---|---|
| 웹 앱화(PWA) | **Next.js metadata + manifest.json** | 코드에 이미 절반 존재 |
| 아이콘 생성 | **sharp**(이미 의존성에 있음) 또는 온라인 PWA 아이콘 생성기 | 512px 원본 1장만 있으면 파생 |
| PWA 품질 검사 | **Lighthouse** (Chrome DevTools 내장 / `npx lighthouse`) | "installable" 판정 목표 |
| 앱 래핑·빌드 | **@bubblewrap/cli** | TWA 표준 툴, Google 공식 |
| 빌드 런타임 | **JDK 17** + **Android SDK** | Bubblewrap가 요구 → **지금 없음, 설치 필요** |
| 서명키 | **keytool**(JDK 포함) 또는 Bubblewrap 자동생성 | ⚠️ 분실 금지 |
| 신뢰 링크 | **assetlinks.json** (`public/.well-known/`에 배포) | SHA-256 지문 필요 |
| 스토어 제출 | **Google Play Console** | AAB 업로드·비공개 테스트 |

### 단계별 명령어 대본

**STEP 1 — 웹을 설치가능 PWA로 (코드 작업, 저리스크)**
```
# 1) manifest.json에 icons 배열 추가 (192/512/maskable)
# 2) app/layout.tsx에 metadata.manifest + themeColor + viewport 추가
# 3) 아이콘 파생 (sharp 이미 설치됨) — 512px 원본에서:
#    node scripts/gen-icons.mjs  (또는 온라인 생성기)
npx lighthouse https://golgoru-sos.vercel.app --view --preset=desktop   # installable 확인
```
→ 산출물: 설치가능 PWA. Claude가 바로 착수 가능한 구간.

**STEP 2 — 빌드 환경 준비 (로컬 1회 세팅)**
```
# JDK 17 설치 (현재 없음)
brew install openjdk@17
# Android 명령줄 도구 설치 (Bubblewrap가 SDK 자동 유도하기도 함)
# Bubblewrap CLI
npm i -g @bubblewrap/cli
bubblewrap doctor            # 환경 점검 (JDK/SDK 경로 확인)
```

**STEP 3 — TWA 프로젝트 생성·빌드**
```
bubblewrap init --manifest https://golgoru-sos.vercel.app/manifest.json
#  → 대화형 입력:
#     packageId = kr.co.golgoru.sos
#     host = golgoru-sos.vercel.app
#     ⚠️ RECORD_AUDIO 권한 포함 여부 = YES (음성녹음 필수)
#     keystore 생성 → 비밀번호 백업!!
bubblewrap build
#  → app-release-signed.aab (스토어용) + app-release-signed.apk (테스트용)
bubblewrap fingerprint list   # SHA-256 지문 확인 (assetlinks에 넣을 값)
```

**STEP 4 — 신뢰 링크 배포 (웹 재배포)**
```
# public/.well-known/assetlinks.json 생성 — 내용:
#   [{ "relation": ["delegate_permission/common.handle_all_urls"],
#      "target": { "namespace":"android_app",
#                  "package_name":"kr.co.golgoru.sos",
#                  "sha256_cert_fingerprints":["<STEP3 지문>"] } }]
# → git push → Vercel 자동배포
# 검증:
curl https://golgoru-sos.vercel.app/.well-known/assetlinks.json
```
> assetlinks의 지문은 **최종 서명키 기준**이어야 함. Play App Signing 쓰면 Google이 재서명하므로, **Play Console이 발급한 SHA-256**을 최종본으로 넣어야 주소창이 사라짐(흔한 함정).

**STEP 5 — 실기기 검증 (제출 전 필수 3종)**
```
adb install app-release-signed.apk
#  ✅ 마이크: SOS 음성 녹음 → 권한 팝업 → 정상 분류
#  ✅ 전화: 전문가 전화 버튼 → OS 다이얼러
#  ✅ 로그인: 카카오/구글 → Custom Tabs로 열림(인앱웹뷰 아님)
#  ✅ 주소창 없음(전체화면) = assetlinks 성공
```

**STEP 6 — Play Console 제출 (비공개 테스트)**
```
# 웹 콘솔 작업 (CLI 아님):
# 1) 개발자 등록 $25 (계정 주체 확정 후)
# 2) 앱 생성 → AAB 업로드 → Play App Signing 활성화
#    → 여기서 나온 SHA-256을 STEP4 assetlinks에 재반영·재배포
# 3) 스토어 등록정보: 아이콘512·스크린샷2·설명·개인정보처리방침(/terms)
# 4) Data Safety 양식: 마이크·전화번호·이메일·프로필 수집 신고
# 5) 비공개 테스트 트랙 → 테스터 이메일 등록 → 출시
```

### 역할 분담 (Claude가 하는 것 vs 회원님이 하는 것)

| Claude가 할 수 있음 | 회원님(사람)만 가능 |
|---|---|
| STEP 1 전부(코드·manifest·아이콘 스크립트) | brew로 JDK 설치(로컬 권한) |
| assetlinks.json 파일 생성(STEP 4) | keystore 비밀번호 관리·백업 |
| gen-icons 스크립트 작성 | 실기기 adb 설치·터치 테스트 |
| 문서·설명문안 | Play Console 계정·결제·심사 제출 |

### 크리티컬 패스 요약

```
[STEP1 웹PWA] → [STEP2 JDK설치] → [STEP3 빌드] → [STEP4 assetlinks]
      ↑Claude          ↑회원님        ↑협업          ↑Claude+배포
                                  → [STEP5 실기기] → [STEP6 콘솔제출]
                                        ↑회원님         ↑회원님(+Claude 문안)
```

**지금 바로 시작 지점 = STEP 1** (계정 주체 미확정과 무관, 순수 웹, 저리스크).
