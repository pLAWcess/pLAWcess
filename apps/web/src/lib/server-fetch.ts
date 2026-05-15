import type { AuthUser } from '@/lib/api';
import { redirect } from 'next/navigation';

export function getRoleHomePath(role: string): string {
  if (role === 'admin') return '/admin/schedule';
  if (role === 'mentor') return '/mentor/dashboard';
  if (role === 'mentee') return '/mentee/dashboard/basic-info';
  return '/login';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const COOKIE_NAME = 'plawcess_token';

export async function serverFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// 데이터가 반드시 있어야 하는 페이지용. 조회에 실패하면 빈 폼으로 떨어뜨리는 대신
// throw 해서 error.tsx 가 받게 한다(= 사용자에게 "데이터가 사라진 것처럼" 보이는 사고 방지).
// 401 은 세션 만료로 보고 로그인으로 보낸다.
export async function serverFetchOrThrow<T>(path: string, token: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.');
  }
  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`데이터를 불러오지 못했어요. (HTTP ${res.status})`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error('서버 응답을 처리하지 못했어요.');
  }
}

export async function getActiveProcessYear(token: string): Promise<string> {
  const schedule = await serverFetch<{ process_year: number }>('/api/cycle-schedules/active', token);
  return schedule ? String(schedule.process_year) : String(new Date().getFullYear());
}

export async function getAuthUser(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  // JWT 디코드 결과에는 account_status 가 없어 미검증 사용자 가드(#289)에서 빠지는 사고가 발생한다.
  // 매 SSR 마다 /api/auth/me 로 DB 의 최신 상태(역할·계정 상태)를 조회한다.
  const data = await serverFetch<{ user: AuthUser }>('/api/auth/me', token);
  return data?.user ?? null;
}
