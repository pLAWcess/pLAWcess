# Mentor Account Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 멘토 계정을 생성하면, 멘토가 이메일/비밀번호로 로그인해 매칭된 멘티 목록을 볼 수 있는 흐름 구현

**Architecture:** DB에 password 필드 추가 → api에 auth/login + admin/mentor 생성 엔드포인트 구현 → web 로그인 페이지를 실제 API에 연결해 역할별 리다이렉트 → 멘토 대시보드 페이지 구현

**Tech Stack:** Next.js 15, Prisma 7, bcryptjs, JWT(jsonwebtoken), TypeScript

---

## 배경 및 설계 결정

- **Auth 방식:** JWT (httpOnly 쿠키) — web ↔ api 분리 구조이므로, api가 `/api/auth/login`으로 토큰을 발급하고 web이 쿠키에 저장
- **비밀번호 저장:** `bcryptjs`로 해시 저장 (DB에 평문 절대 금지)
- **역할별 리다이렉트:**
  - `mentee` → `/mentee/dashboard`
  - `mentor` → `/mentor/dashboard`
  - `admin` → `/admin/dashboard`
- **멘토 계정 생성:** 관리자가 어드민 페이지에서 이름/이메일/임시비밀번호/재직 법전원을 입력해 생성
- **멘토 대시보드:** 매칭된 멘티 카드 목록 + 카카오톡 오픈채팅 링크 입력란 (초심플)
- **현재 x-user-id 헤더 패턴 유지:** 기존 API는 건드리지 않고, 새 API에서 JWT 검증 도입

---

## 파일 구조

### 새로 생성
| 파일 | 역할 |
|------|------|
| `packages/database/prisma/schema.prisma` | User에 `password_hash` 필드 추가 |
| `apps/api/src/app/api/auth/login/route.ts` | POST /api/auth/login |
| `apps/api/src/lib/jwt.ts` | JWT 발급/검증 유틸 |
| `apps/api/src/lib/auth.ts` | 요청에서 JWT 파싱하는 헬퍼 |
| `apps/api/src/app/api/admin/mentors/route.ts` | POST /api/admin/mentors (멘토 계정 생성) |
| `apps/web/src/app/mentor/dashboard/page.tsx` | 멘토 대시보드 |
| `apps/web/src/app/mentor/dashboard/layout.tsx` | DashboardShell 재사용 |
| `apps/api/src/app/api/mentor/mentees/route.ts` | GET /api/mentor/mentees (매칭된 멘티 목록) |

### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/src/app/login/page.tsx` | 실제 로그인 API 연결 + 역할별 리다이렉트 |
| `apps/web/src/app/admin/users/page.tsx` | 멘토 계정 생성 UI 구현 |

---

## Task 1: DB에 password_hash 필드 추가

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: schema.prisma에 password_hash 추가**

`User` 모델에 아래 줄 추가 (email 아래):
```prisma
password_hash   String?         @db.VarChar(100)
```

`?`로 nullable로 두는 이유: 기존 테스트 데이터와 마이그레이션 충돌 방지

- [ ] **Step 2: Prisma 클라이언트 재생성 및 DB 반영**

```bash
cd /Users/jihun/workspace/pLAWcess
pnpm db:generate
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: 커밋**

```bash
git add packages/database/prisma/schema.prisma
git commit -m "feat: User 모델에 password_hash 필드 추가"
```

---

## Task 2: JWT 유틸 + Auth API (login)

**Files:**
- Create: `apps/api/src/lib/jwt.ts`
- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/app/api/auth/login/route.ts`

- [ ] **Step 1: jsonwebtoken, bcryptjs 패키지 설치**

```bash
cd /Users/jihun/workspace/pLAWcess
pnpm --filter @plawcess/api add jsonwebtoken bcryptjs
pnpm --filter @plawcess/api add -D @types/jsonwebtoken @types/bcryptjs
```

- [ ] **Step 2: JWT 유틸 작성**

`apps/api/src/lib/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod';

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
```

- [ ] **Step 3: auth 헬퍼 작성**

`apps/api/src/lib/auth.ts`:
```typescript
import { NextRequest } from 'next/server';
import { verifyToken, JwtPayload } from './jwt';

export function getAuthUser(req: NextRequest): JwtPayload | null {
  try {
    const token = req.cookies.get('token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: login 라우트 작성**

`apps/api/src/app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@plawcess/database';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password_hash) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = signToken({ userId: user.user_id, role: user.current_role });

  const res = NextResponse.json({
    user: { id: user.user_id, name: user.name, role: user.current_role },
  });

  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7일
  });

  return res;
}
```

- [ ] **Step 5: 로컬에서 동작 확인**

```bash
pnpm dev:api
# 별도 터미널에서:
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

Expected: `{"error":"이메일 또는 비밀번호가 올바르지 않습니다."}`

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/lib/ apps/api/src/app/api/auth/
git commit -m "feat(#): JWT 기반 로그인 API 구현"
```

---

## Task 3: Admin — 멘토 계정 생성 API

**Files:**
- Create: `apps/api/src/app/api/admin/mentors/route.ts`

- [ ] **Step 1: 멘토 계정 생성 라우트 작성**

`apps/api/src/app/api/admin/mentors/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@plawcess/database';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/auth';

// POST /api/admin/mentors
// Body: { name, email, password, currentLawschool }
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const { name, email, password, currentLawschool } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password는 필수입니다.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      current_role: 'mentor',
      school_name: currentLawschool ?? null,
    },
    select: { user_id: true, name: true, email: true, current_role: true },
  });

  return NextResponse.json(user, { status: 201 });
}

// GET /api/admin/mentors — 멘토 목록 조회
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const mentors = await prisma.user.findMany({
    where: { current_role: 'mentor', is_deleted: false },
    select: { user_id: true, name: true, email: true, school_name: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(mentors);
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/src/app/api/admin/
git commit -m "feat(#): 어드민 멘토 계정 생성/조회 API 구현"
```

---

## Task 4: 로그인 페이지 — API 연결 + 역할별 리다이렉트

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: login/page.tsx 수정**

`handleSubmit`을 실제 API 호출로 교체:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '@/components/layout/Footer';

const ROLE_REDIRECT: Record<string, string> = {
  mentee: '/mentee/dashboard',
  mentor: '/mentor/dashboard',
  admin: '/admin/dashboard',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '로그인에 실패했습니다.');
        return;
      }
      const redirect = ROLE_REDIRECT[data.user.role] ?? '/';
      router.push(redirect);
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-border flex items-center px-6 shrink-0">
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          pLAWcess
        </Link>
      </header>
      <main className="flex-1 bg-page-bg flex justify-center items-start px-4 pt-20">
        <div className="w-full max-w-sm py-16">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">로그인</h1>
            <p className="mt-2 text-sm text-text-secondary">로그인하여 계속하세요</p>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-text-primary">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text-primary">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md bg-white text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors mt-1 disabled:opacity-50"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(#): 로그인 API 연결 및 역할별 리다이렉트 구현"
```

---

## Task 5: Admin — 멘토 계정 생성 UI

**Files:**
- Modify: `apps/web/src/app/admin/users/page.tsx`

- [ ] **Step 1: admin/users/page.tsx 구현**

```tsx
'use client';

import { useState, useEffect } from 'react';

interface Mentor {
  user_id: string;
  name: string;
  email: string;
  school_name: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', currentLawschool: '' });
  const [message, setMessage] = useState('');

  async function fetchMentors() {
    const res = await fetch('http://localhost:3001/api/admin/mentors', { credentials: 'include' });
    if (res.ok) setMentors(await res.json());
  }

  useEffect(() => { fetchMentors(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const res = await fetch('http://localhost:3001/api/admin/mentors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? '오류가 발생했습니다.');
      return;
    }
    setMessage(`${data.name} 멘토 계정이 생성되었습니다.`);
    setForm({ name: '', email: '', password: '', currentLawschool: '' });
    fetchMentors();
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-bold text-text-primary mb-6">멘토 계정 생성</h1>
        <form onSubmit={handleCreate} className="bg-white border border-border rounded-xl p-6 space-y-4 max-w-md">
          {[
            { key: 'name', label: '이름', type: 'text', placeholder: '홍길동' },
            { key: 'email', label: '이메일', type: 'email', placeholder: 'mentor@example.com' },
            { key: 'password', label: '임시 비밀번호', type: 'password', placeholder: '••••••••' },
            { key: 'currentLawschool', label: '재직 법전원', type: 'text', placeholder: '고려대학교 법학전문대학원' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={key !== 'currentLawschool'}
                className="px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
          {message && <p className="text-sm text-brand">{message}</p>}
          <button type="submit" className="w-full py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
            계정 생성
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold text-text-primary mb-4">멘토 목록</h2>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-page-bg border-b border-border">
              <tr>
                {['이름', '이메일', '법전원', '생성일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mentors.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-text-secondary">멘토가 없습니다.</td></tr>
              )}
              {mentors.map(m => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-text-primary">{m.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.school_name ?? '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(m.created_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/src/app/admin/users/page.tsx
git commit -m "feat(#): 어드민 멘토 계정 생성 UI 구현"
```

---

## Task 6: 멘토 대시보드

**Files:**
- Create: `apps/web/src/app/mentor/dashboard/layout.tsx`
- Create: `apps/web/src/app/mentor/dashboard/page.tsx`
- Create: `apps/api/src/app/api/mentor/mentees/route.ts`

- [ ] **Step 1: 매칭된 멘티 목록 API 작성**

`apps/api/src/app/api/mentor/mentees/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@plawcess/database';
import { getAuthUser } from '@/lib/auth';

// GET /api/mentor/mentees?year=2026
// 현재 로그인한 멘토의 매칭된 멘티 목록 반환
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'mentor') {
    return NextResponse.json({ error: '멘토 권한이 필요합니다.' }, { status: 403 });
  }

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()));

  // 멘토의 Application 조회
  const mentorApp = await prisma.application.findUnique({
    where: {
      user_id_process_year_role: {
        user_id: auth.userId,
        process_year: year,
        role: 'mentor',
      },
    },
  });

  if (!mentorApp) {
    return NextResponse.json([]);
  }

  // 매칭된 멘티 조회
  const matches = await prisma.matchResult.findMany({
    where: {
      mentor_application_id: mentorApp.application_id,
      match_status: { not: 'cancelled' },
    },
    include: {
      mentee_application: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
          mentee_record: {
            select: {
              target_school_ga: true,
              target_school_na: true,
              desired_mentor: true,
            },
          },
        },
      },
    },
  });

  const result = matches.map(m => ({
    matchId: m.match_id,
    mentee: {
      name: m.mentee_application.user.name,
      email: m.mentee_application.user.email,
      phone: m.mentee_application.user.phone,
      targetSchoolGa: m.mentee_application.mentee_record?.target_school_ga ?? null,
      targetSchoolNa: m.mentee_application.mentee_record?.target_school_na ?? null,
      desiredMentor: m.mentee_application.mentee_record?.desired_mentor ?? null,
    },
  }));

  return NextResponse.json(result);
}
```

- [ ] **Step 2: 멘토 대시보드 layout**

`apps/web/src/app/mentor/dashboard/layout.tsx`:
```tsx
import DashboardShell from '@/components/layout/DashboardShell';

export default function MentorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

- [ ] **Step 3: 멘토 대시보드 page**

`apps/web/src/app/mentor/dashboard/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';

interface MenteeInfo {
  matchId: string;
  mentee: {
    name: string;
    email: string;
    phone: string | null;
    targetSchoolGa: string | null;
    targetSchoolNa: string | null;
    desiredMentor: string | null;
  };
}

export default function MentorDashboardPage() {
  const [mentees, setMentees] = useState<MenteeInfo[]>([]);
  const [kakaoLink, setKakaoLink] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/mentor/mentees', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMentees(data); });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">멘토 대시보드</h1>
        <p className="mt-1 text-sm text-text-secondary">매칭된 멘티 목록입니다.</p>
      </div>

      {/* 카카오톡 단톡방 링크 */}
      <div className="bg-white border border-border rounded-xl p-5 max-w-md">
        <label className="text-sm font-medium text-text-primary">카카오톡 오픈채팅 링크</label>
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            value={kakaoLink}
            onChange={(e) => setKakaoLink(e.target.value)}
            placeholder="https://open.kakao.com/o/..."
            className="flex-1 px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={() => kakaoLink && navigator.clipboard.writeText(kakaoLink)}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          >
            복사
          </button>
        </div>
        <p className="mt-1.5 text-xs text-text-secondary">링크를 멘티에게 공유하세요.</p>
      </div>

      {/* 멘티 목록 */}
      {mentees.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-8 text-center text-text-secondary text-sm">
          아직 매칭된 멘티가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mentees.map(({ matchId, mentee }) => (
            <div key={matchId} className="bg-white border border-border rounded-xl p-5 space-y-2">
              <p className="font-semibold text-text-primary">{mentee.name}</p>
              <p className="text-sm text-text-secondary">{mentee.email}</p>
              {mentee.phone && <p className="text-sm text-text-secondary">{mentee.phone}</p>}
              <div className="pt-1 border-t border-border text-xs text-text-secondary space-y-0.5">
                {mentee.targetSchoolGa && <p>가군: {mentee.targetSchoolGa}</p>}
                {mentee.targetSchoolNa && <p>나군: {mentee.targetSchoolNa}</p>}
              </div>
              {mentee.desiredMentor && (
                <p className="text-xs text-text-secondary italic">"{mentee.desiredMentor}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/app/api/mentor/ apps/web/src/app/mentor/
git commit -m "feat(#): 멘토 대시보드 및 매칭 멘티 조회 API 구현"
```

---

## 검증 시나리오

1. **어드민으로 로그인** → `/admin/dashboard` 리다이렉트 확인
2. **멘토 계정 생성** → `/admin/users`에서 이름/이메일/비밀번호 입력 → 목록에 표시 확인
3. **멘토로 로그인** → `/mentor/dashboard` 리다이렉트 확인
4. **멘토 대시보드** → 매칭 없으면 "아직 매칭된 멘티가 없습니다." 표시 확인
5. **잘못된 비밀번호** → 로그인 에러 메시지 표시 확인
