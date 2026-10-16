'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useGroupDetail, usePeople, useSaveGroup } from '../hooks/use-groups';
import { emptyGroupForm, formFromGroup, formToUpsert, validateGroup } from '../model';
import type { AdminGroup, GroupFormState } from '../types';
import { BasicFields, CoverField, PeopleFields } from './group-form-fields';
import { RoomFields, RuleFields } from './group-form-rooms';
import { SideSheet } from './overlay';
import btn from './overlay.module.css';

const MAX_COVER = 5 * 1024 * 1024;

/** Ảnh chọn từ máy → data URL (chưa có adapter storage — DV-G4c-3) */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('read')));
    r.onerror = () => reject(r.error ?? new Error('read'));
    r.readAsDataURL(file);
  });
}

interface BodyProps {
  initial: GroupFormState;
  all: AdminGroup[];
  onClose: () => void;
}

function FormBody({ initial, all, onClose }: BodyProps) {
  const t = useTranslations('groups.form');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const save = useSaveGroup();
  const people = usePeople(true).data ?? [];
  const [f, setF] = useState(initial);
  const set = (p: Partial<GroupFormState>) => setF((s) => ({ ...s, ...p }));

  const onFile = (file: File) => {
    if (file.size > MAX_COVER) return toast(t('coverTooLarge'));
    void readImage(file).then((url) => set({ coverUrl: url }));
  };

  const submit = () => {
    const err = validateGroup(f, all);
    if (err) return toast(t(`err.${err}`, { province: f.province }));
    if (save.isPending) return;
    save.mutate(
      { body: formToUpsert(f), id: f.id },
      {
        onSuccess: (g) => {
          toast(f.id ? tt('updated', { name: g.name }) : tt('created', { name: g.name }));
          onClose();
        },
      },
    );
  };

  return (
    <SideSheet
      open
      title={f.id ? t('editTitle') : t('createTitle')}
      closeLabel={t('close')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btn.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={btn.primary} onClick={submit}>
            {f.id ? t('save') : t('create')}
          </button>
        </>
      }
    >
      <CoverField f={f} set={set} onFile={onFile} />
      <BasicFields f={f} set={set} />
      <PeopleFields f={f} set={set} people={people} />
      <RoomFields f={f} set={set} />
      <RuleFields f={f} set={set} />
    </SideSheet>
  );
}

interface Props {
  /** null = đóng; 'new' = tạo; id = sửa */
  target: string | null;
  all: AdminGroup[];
  onClose: () => void;
}

/** D-28 → D-30: drawer Tạo / Sửa nhóm; form sửa dựng khi chi tiết nhóm đã về */
export function GroupForm({ target, all, onClose }: Props) {
  const editId = target && target !== 'new' ? target : null;
  const detail = useGroupDetail(editId);
  if (!target) return null;
  if (!editId) return <FormBody initial={emptyGroupForm()} all={all} onClose={onClose} />;
  if (!detail.data) return null;
  return <FormBody key={editId} initial={formFromGroup(detail.data)} all={all} onClose={onClose} />;
}
