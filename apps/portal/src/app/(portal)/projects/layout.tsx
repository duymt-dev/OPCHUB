import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProjectsPageHeader, ProjectsUiProvider } from '@/features/projects';

export const metadata: Metadata = { title: 'Dự án OPC · OPC Hub' };

/** Không bọc Suspense: fallback đứng yên khi harness parity dừng đồng hồ */
export const dynamic = 'force-dynamic';

/**
 * P-55 → P-78. Tiêu đề trang + drawer đăng/sửa dự án + hộp chia sẻ dùng chung cho
 * `/projects`, `/projects/mine`, `/projects/[id]`.
 */
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectsUiProvider>
      <ProjectsPageHeader />
      {children}
    </ProjectsUiProvider>
  );
}
