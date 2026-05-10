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
