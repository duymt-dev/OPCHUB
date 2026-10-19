import type { AdminMe } from '@opchub/shared/api';
import { create } from 'zustand';

/** RB-R09: Super Admin xem thử Admin với quyền một vai trò — chỉ trong bộ nhớ, không gọi server */
export interface RolePreview {
  roleId: string;
  roleName: string;
  permissions: readonly string[];
}

interface AuthState {
  accessToken: string | null;
  me: AdminMe | null;
  preview: RolePreview | null;
  /** Đang đăng xuất chủ động — AuthGate không chèn `/login?next=…` */
  signedOut: boolean;
  setSession: (accessToken: string, me: AdminMe) => void;
  setMe: (me: AdminMe) => void;
  setPreview: (p: RolePreview | null) => void;
  clear: () => void;
  signOut: () => void;
}

/** Access token + xem thử chỉ trong bộ nhớ — không localStorage (standards/frontend/routing-auth.md) */
export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  me: null,
  preview: null,
  signedOut: false,
  setSession: (accessToken, me) => set({ accessToken, me, signedOut: false }),
  setMe: (me) => set({ me }),
  setPreview: (preview) => set({ preview }),
  clear: () => set({ accessToken: null, me: null, preview: null }),
  signOut: () => set({ accessToken: null, me: null, preview: null, signedOut: true }),
}));
