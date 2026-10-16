import type { Metadata } from 'next';
import { ProjectsScreen } from '@/features/projects';

export const metadata: Metadata = { title: 'Dự án · OPC Hub Admin' };

/** /projects?tab&view&page&size · /projects/:id/review (D-51 → D-57); tab/trang trên URL */
export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  return <ProjectsScreen />;
}
