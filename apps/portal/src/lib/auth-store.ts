import type { Me } from '@opchub/shared/api';
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  me: Me | null;
  setSession: (accessToken: string, me: Me) => void;
  clear: () => void;
}

/** Access token chỉ trong bộ nhớ — không localStorage (standards/frontend/routing-auth.md) */
export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  me: null,
  setSession: (accessToken, me) => set({ accessToken, me }),
  clear: () => set({ accessToken: null, me: null }),
}));
