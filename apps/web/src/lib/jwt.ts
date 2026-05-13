import { jwtVerify } from 'jose';
import type { AuthUser } from '@/lib/api';

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
const secret = new TextEncoder().encode(rawSecret);

export async function decodeSessionToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const p = payload as Record<string, unknown>;
    if (typeof p.user_id !== 'string' || typeof p.current_role !== 'string') return null;
    if (!p.name) return null; // 구 토큰 → API fallback
    return {
      user_id: p.user_id,
      current_role: p.current_role,
      name: p.name as string,
      email: typeof p.email === 'string' ? p.email : '',
      login_id: typeof p.login_id === 'string' ? p.login_id : null,
    };
  } catch {
    return null;
  }
}
