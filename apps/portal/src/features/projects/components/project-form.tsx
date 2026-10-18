'use client';

import { translateErrors, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useFormErrors } from '@/lib/use-form-errors';
import {
  emptyForm,
  formFromProject,
  formToSave,
  PROJECT_FIELD_MAP,
  type SubmitField,
  validateSubmit,
} from '../model';
import { validateContact } from '../contact-model';
import { useSaveProject } from '../hooks/use-project-actions';
import { useProjectImages } from '../hooks/use-project-images';
import { useOwnerContact, useOwnProject } from '../hooks/use-projects';
import type { FormSet, ProjectFormState } from '../types';
import { BasicSection } from './form-basic';
import { ContactSection } from './form-contact';
import { FundSection, RepoSection } from './form-repo-fund';
import { AudienceSection, TeamSection } from './form-team';
import styles from './form.module.css';
import { SideSheet } from './overlay';

interface BodyProps {
  initial: ProjectFormState;
  editId: string | null;
  onClose: () => void;
}

function FormBody({ initial, editId, onClose }: BodyProps) {
  const t = useTranslations('projects.form');
  const toast = useToast();
  const router = useRouter();
  const save = useSaveProject();
  const [f, setF] = useState(initial);
  const fe = useFormErrors<SubmitField>();
  const tp = useTranslations('projects.toast');
  const set: FormSet = (k, v) => {
    setF((s) => ({ ...s, [k]: v }));
    // Sửa ô → xoá lỗi ô đó; tắt gọi vốn / đổi nhà cung cấp repo → xoá lỗi khối đó
    fe.clear(k, ...(k === 'fundOn' ? ['fundAmount', 'fundEquity'] : []));
    if (k === 'repoProvider') fe.clear('repoUrl');
  };
  const images = useProjectImages();
  const setAvatar = (i: number, avatarUrl: string | null) =>
    setF((s) => ({ ...s, team: s.team.map((m, j) => (j === i ? { ...m, avatarUrl } : m)) }));
  const busy = save.isPending || images.uploading;

  const submit = (send: boolean) => {
    // Lưu nháp vẫn kiểm liên hệ công khai (server kiểm mọi lần lưu)
    const errs = send ? validateSubmit(f) : validateContact(f);
    if (fe.check(translateErrors(errs, (e) => t(`err.${e}`)))) return;
    if (busy) return;
    save.mutate(
      { body: formToSave(f, send), id: editId ?? undefined },
      {
        onSuccess: () => {
          toast(send ? t('submitted') : t('savedDraft'));
          onClose();
          router.push('/projects/mine');
        },
        onError: (e) => fe.fromApi(e, PROJECT_FIELD_MAP, tp('failed')),
      },
    );
  };

  return (
    <SideSheet
      open
      title={editId ? t('editTitle') : t('newTitle')}
      closeLabel={t('close')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnHover}`}
            disabled={busy}
            onClick={() => submit(false)}
          >
            {t('draft')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={busy}
            onClick={() => submit(true)}
          >
            {t('submit')}
          </button>
        </>
      }
    >
      <BasicSection f={f} set={set} pickImage={images.pickCover} err={fe.err} />
      <RepoSection f={f} set={set} err={fe.err} />
      <FundSection f={f} set={set} err={fe.err} />
      <ContactSection f={f} set={set} err={fe.err} />
      <TeamSection f={f} set={set} pickImage={images.pickTeam} setAvatar={setAvatar} />
      <AudienceSection f={f} set={set} />
    </SideSheet>
  );
}

/**
 * P-73 → P-77: Drawer "Đăng dự án mới" / "Chỉnh sửa dự án". "Lưu nháp" → draft,
 * "Gửi đăng dự án" → pending_review (server chuyển trạng thái — luật 7), rồi sang Dự án của tôi.
 */
export function ProjectForm({ editId, onClose }: { editId: string | null; onClose: () => void }) {
  const owner = useAuthStore((s) => s.me?.fullName ?? '');
  const own = useOwnProject(editId);
  const contact = useOwnerContact(!editId);
  if (editId && !own.data) return null;
  // Tạo mới: chờ hồ sơ để điền sẵn liên hệ (lỗi tải hồ sơ → để trống, không chặn form)
  if (!editId && contact.isPending) return null;
  const initial = editId && own.data ? formFromProject(own.data) : emptyForm(owner, contact.data);
  return <FormBody initial={initial} editId={editId} onClose={onClose} />;
}
