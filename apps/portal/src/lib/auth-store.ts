import type { Me } from '@opchub/shared/api';
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  me: Me | null;
  /** Đang đăng xuất chủ động — AuthGate không chèn `/login?next=…` */
  signedOut: boolean;
  setSession: (accessToken: string, me: Me) => void;
  clear: () => void;
  signOut: () => void;
}

/** Access token chỉ trong bộ nhớ — không localStorage (standards/frontend/routing-auth.md) */
export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  me: null,
  signedOut: false,
  setSession: (accessToken, me) => set({ accessToken, me, signedOut: false }),
  clear: () => set({ accessToken: null, me: null }),
  signOut: () => set({ accessToken: null, me: null, signedOut: true }),
}));
