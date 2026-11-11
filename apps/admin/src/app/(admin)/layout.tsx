import type { ReactNode } from 'react';
import { AuthGate } from '@/features/auth';
import { AdminShell } from '@/features/shell';
import { AdminIntlReady } from '@/providers/admin-intl-ready';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminIntlReady>
        <AdminShell>{children}</AdminShell>
      </AdminIntlReady>
    </AuthGate>
  );
}
