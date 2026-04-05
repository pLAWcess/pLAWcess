# Project Reorganization Design Spec (2026-04-05)

## 1. 개요
현재 `docs` 폴더에 혼재된 문서들을 용도별로 분류하고, 실제 비즈니스 로직인 `withdraw.ts`를 `apps/api` 서비스 내부로 이동하여 프로젝트의 구조적 일관성을 확보합니다.

## 2. 주요 변경 사항

### 2.1. `docs` 폴더 구조 재구성
문서의 성격에 따라 하위 폴더를 생성하고 파일을 이동합니다.

- **`docs/db/`**: 데이터베이스 설계 및 마이그레이션 관련
  - `database-scheme.dbml`
  - `DB 스키마 시각화.png`
  - `schema_viz.html`
  - `migration_manual.sql`
  - `migration_notes.sql`
- **`docs/api/`**: API 명세 관련
  - `api-spec.md`
- **`docs/architecture/`**: 서비스 구조 및 흐름도 관련
  - `ia-routing.md`
- **`docs/conventions/`**: (기존 유지) 개발 가이드 및 규칙

### 2.2. 비즈니스 로직 이동
`docs` 폴더에 위치하던 유저 탈퇴 처리 로직을 실제 API 서비스 코드로 이동합니다.

- **대상:** `docs/withdraw.ts`
- **목적지:** `apps/api/src/features/user/withdraw.ts`
- **사유:** 실제 동작하는 코드는 문서 폴더가 아닌 서비스 로직 폴더(`features`)에서 관리되어야 함.

### 2.3. 스크립트 도구 폴더명 변경 (옵션)
- **변경:** `tools/` -> `scripts/`
- **대상 파일:** `tools/scrape_grades.py` -> `scripts/scrape_grades.py`
- **사유:** 프로젝트 전반에서 사용하는 실행 스크립트임을 명확히 하기 위함.

## 3. 작업 순서
1. `docs` 하위 폴더(`db`, `api`, `architecture`) 생성
2. `docs` 내 파일들을 해당 폴더로 이동
3. `apps/api/src/features/user` 폴더 생성 및 `withdraw.ts` 이동
4. `tools` 폴더명을 `scripts`로 변경
5. 이동된 파일들에 대한 경로 참조가 있다면 (예: `README.md`, `package.json` 등) 업데이트

## 4. 검증 계획
- 모든 파일이 의도한 위치로 이동되었는지 확인
- `package.json`의 스크립트 등 경로가 변경된 부분이 정상 작동하는지 확인
- `withdraw.ts`가 이동된 위치에서 정상적으로 컴파일되는지 확인 (필요 시 타입 체크)
