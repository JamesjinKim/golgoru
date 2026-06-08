# 이슈 카드: W1-07 — README.md 업데이트

## 담당
PM / 아키텍트

## 배경
현재 README가 최소 정보만 포함하고 있어, 새 팀원이 빠르게 투입되기 어렵습니다. 아키텍처, 실행 방법, 배포 절차를 정리합니다.

## 완료 조건
- [ ] 기술 스택 및 아키텍처 개요 추가
- [ ] 로컬 실행 방법 (의존성, 환경 변수, 명령어)
- [ ] 배포 방법 (Vercel, Supabase)
- [ ] 팀 규칙 추가 (브랜치 전략, 커밋 컨벤션, PR 리뷰)
- [ ] 현재 한계/리스크 섹션 추가

## 참고 파일
- `package.json`
- `next.config.js`
- `docs/decisions/adr-001-admin-auth.md`
- `docs/decisions/adr-002-expert-repository.md`

## 작업 순서
1. 기존 README를 확장
2. `docs/decisions/`의 ADR 내용을 요약하여 포함
3. 팀 규칙(브랜치/커밋/리뷰) 섹션 추가
4. 현재 known issues를 리스크 섹션에 정리
5. 팀원 리뷰 후 머지
