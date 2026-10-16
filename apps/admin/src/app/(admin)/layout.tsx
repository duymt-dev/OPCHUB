import type { ReactNode } from 'react';
import { AuthGate } from '@/features/auth';
import { AdminShell } from '@/features/shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  );
}
