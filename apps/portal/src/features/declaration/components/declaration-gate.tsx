'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { declarationKeys, fetchDeclarationDraft } from '../api';
import { BusinessDeclaration } from './business-declaration';
import { PersonalDeclaration } from './personal-declaration';

/**
 * V4-607 (UP-02): `me.needsDeclaration` → popup khai báo đè lên trang (`page`), chưa gắn PaywallGate
 * nên popup Bảng giá không hiện. Lưu xong `me` mới → `children` (trang trong PaywallGate).
 */
export function DeclarationGate({
  page,
  onLogout,
  children,
}: {
  page: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}) {
  const me = useAuthStore((s) => s.me);
  const qc = useQueryClient();
  const needs = !!me?.needsDeclaration;
  const draft = useQuery({
    queryKey: declarationKeys.draft,
    queryFn: fetchDeclarationDraft,
    enabled: needs,
    retry: false,
  });
  if (!me || !needs) return children;
  // Chờ bản nháp (điền sẵn dữ liệu lúc đăng ký); lỗi thì mở popup trống
  if (draft.isPending) return page;
  const logout = () => {
    qc.removeQueries({ queryKey: declarationKeys.draft });
    onLogout();
  };
  return (
    <>
      {page}
      {me.accountType === 'business' ? (
        <BusinessDeclaration name={me.fullName} draft={draft.data} onLogout={logout} />
      ) : (
        <PersonalDeclaration name={me.fullName} draft={draft.data} onLogout={logout} />
      )}
    </>
  );
}
