'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ProjectForm } from './project-form';
import { ShareModal } from './share-modal';
import { useStorePostingIntent } from '../store-posting-intent';

/**
 * Form đăng/sửa dự án (drawer) và hộp chia sẻ dùng chung cho mọi màn dưới `/projects`.
 * Không có URL riêng (D-39: chỉ chi tiết dự án có URL) — giữ nền màn đang xem.
 */
interface ProjectsUi {
  openNew: () => void;
  openEdit: (id: string) => void;
  openShare: (p: { id: string; name: string }) => void;
}

const Ctx = createContext<ProjectsUi>({
  openNew: () => undefined,
  openEdit: () => undefined,
  openShare: () => undefined,
});

export const useProjectsUi = () => useContext(Ctx);

type FormTarget = { mode: 'new' } | { mode: 'edit'; id: string } | null;

export function ProjectsUiProvider({ children }: { children: ReactNode }) {
  const posting = useStorePostingIntent();
  const [form, setForm] = useState<FormTarget>(null);
  const [share, setShare] = useState<{ id: string; name: string } | null>(null);
  const closeForm = useCallback(() => setForm(null), []);
  const closeShare = useCallback(() => setShare(null), []);
  const value = useMemo<ProjectsUi>(
    () => ({
      openNew: () => setForm({ mode: 'new' }),
      openEdit: (id) => setForm({ mode: 'edit', id }),
      openShare: setShare,
    }),
    [],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {posting.source ? (
        <ProjectForm editId={null} store={posting.source} onClose={posting.close} />
      ) : null}
      {form ? (
        <ProjectForm
          key={form.mode === 'edit' ? form.id : 'new'}
          editId={form.mode === 'edit' ? form.id : null}
          onClose={closeForm}
        />
      ) : null}
      <ShareModal project={share} onClose={closeShare} />
    </Ctx.Provider>
  );
}
