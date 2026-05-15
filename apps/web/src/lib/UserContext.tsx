'use client';

import { createContext, useContext } from 'react';
import type { AuthUser } from '@/lib/api';

const UserContext = createContext<AuthUser | null>(null);

export function UserProvider({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

// SSR 단계에서 layout 이 채워준 AuthUser 를 client 컴포넌트가 가져온다.
// account_status 가 포함되어 있어 검증 가드(#289)에서 사용한다.
export function useUser(): AuthUser | null {
  return useContext(UserContext);
}

export function useIsVerified(): boolean {
  const user = useUser();
  return user?.account_status === 'active';
}
