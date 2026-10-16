import type { ReactNode } from 'react';
import { AuthGate } from '@/features/auth';
import { PortalShell } from '@/features/shell';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <PortalShell>{children}</PortalShell>
    </AuthGate>
  );
}
