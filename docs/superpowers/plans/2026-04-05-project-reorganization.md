# 프로젝트 구조 재정리 실행 계획 (2026-04-05)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs` 폴더 내 파일들을 용도별로 분류하고, 비즈니스 로직(`withdraw.ts`)을 API 서버 내부로 이동하며, `tools/` 폴더를 `scripts/`로 변경하여 프로젝트 구조를 정돈합니다.

**Architecture:** 
- `docs/` 하위 폴더(`db`, `api`, `architecture`) 생성 및 파일 이동
- `apps/api/src/features/user/withdraw.ts`로 로직 이동 및 `@plawcess/database` 의존성 연결
- `tools/` -> `scripts/` 이름 변경 및 관련 참조 업데이트

**Tech Stack:** Node.js, Next.js, pnpm (Workspaces), Prisma

---

### Task 1: `docs` 폴더 구조 재정리

**Files:**
- Create: `docs/db/`, `docs/api/`, `docs/architecture/`
- Move: `docs/*.md`, `docs/*.dbml`, `docs/*.png`, `docs/*.html`, `docs/*.sql`

- [ ] **Step 1: 하위 폴더 생성**
Run: `mkdir docs/db, docs/api, docs/architecture`

- [ ] **Step 2: 파일 이동 (DB 관련)**
Run: `move docs/database-scheme.dbml docs/db/`, `move "docs/DB 스키마 시각화.png" docs/db/`, `move docs/schema_viz.html docs/db/`, `move docs/migration_manual.sql docs/db/`, `move docs/migration_notes.sql docs/db/`

- [ ] **Step 3: 파일 이동 (API 관련)**
Run: `move docs/api-spec.md docs/api/`

- [ ] **Step 4: 파일 이동 (Architecture 관련)**
Run: `move docs/ia-routing.md docs/architecture/`

- [ ] **Step 5: 커밋**
Run: `git add docs/db docs/api docs/architecture && git commit -m "chore: docs 폴더 파일 용도별 분류"`

---

### Task 2: `withdraw.ts` 로직 이동 및 의존성 설정

**Files:**
- Create: `apps/api/src/features/user/withdraw.ts`
- Modify: `apps/api/package.json`
- Delete: `docs/withdraw.ts`

- [ ] **Step 1: API 패키지에 데이터베이스 의존성 추가**
Modify: `apps/api/package.json`
```json
"dependencies": {
  "@plawcess/database": "workspace:*",
  ...
}
```

- [ ] **Step 2: `pnpm install` 실행**
Run: `pnpm install`

- [ ] **Step 3: `withdraw.ts` 이동 및 코드 수정**
Create: `apps/api/src/features/user/withdraw.ts` (폴더 생성 포함)
코드 수정 내용: `import { prisma } from '@/lib/prisma'` -> `import { prisma } from '@plawcess/database'`

- [ ] **Step 4: 기존 파일 삭제**
Run: `rm docs/withdraw.ts`

- [ ] **Step 5: 커밋**
Run: `git add apps/api docs/withdraw.ts && git commit -m "feat: 유저 탈퇴 로직을 API 서비스 내부로 이동"`

---

### Task 3: `tools` 폴더명 변경 및 참조 업데이트

**Files:**
- Rename: `tools/` -> `scripts/`
- Modify: `README.md`

- [ ] **Step 1: 폴더명 변경**
Run: `move tools scripts`

- [ ] **Step 2: `README.md` 내 경로 업데이트**
Modify: `README.md` (`tools/` 문자열을 `scripts/`로 변경)

- [ ] **Step 3: 커밋**
Run: `git add scripts README.md && git commit -m "chore: tools 폴더명을 scripts로 변경 및 참조 업데이트"`

---

### Task 4: 최종 검증

- [ ] **Step 1: 파일 위치 확인**
Run: `ls -R docs`, `ls -R scripts`, `ls -R apps/api/src/features`

- [ ] **Step 2: API 서버 빌드 시도 (타입 체크용)**
Run: `pnpm --filter api build`
