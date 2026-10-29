'use client';

import type { AdminRoom } from '@opchub/shared/api-domains';
import { translateErrors, useImageUpload, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { uploadImage } from '@/lib/upload-image';
import { useFormErrors } from '@/lib/use-form-errors';
import { useGroupDetail, usePeople, useSaveGroup } from '../hooks/use-groups';
import {
  emptyGroupForm,
  formFromGroup,
  formToUpsert,
  GROUP_FIELD_MAP,
  validateGroup,
} from '../model';
import type { AdminGroup, GroupField, GroupFormState } from '../types';
import { BasicFields, CoverField, PeopleFields } from './group-form-fields';
import { KindFields } from './group-form-kind';
import { RoomFields, RuleFields } from './group-form-rooms';
import { SideSheet } from './overlay';
import { ManageTopics } from './topic-manager';
import { topicSync } from '../model-topics';
import btn from './overlay.module.css';

interface BodyProps {
  initial: GroupFormState;
  all: AdminGroup[];
  /** Chủ đề còn sống (chỉ khi sửa) — D-111 */
  topics?: AdminRoom[];
  onClose: () => void;
}

function FormBody({ initial, all, topics, onClose }: BodyProps) {
  const t = useTranslations('groups.form');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const save = useSaveGroup();
  const people = usePeople(true).data ?? [];
  const [f, setF] = useState(initial);
  const fe = useFormErrors<GroupField>();
  const set = (p: Partial<GroupFormState>) => {
    setF((s) => ({ ...s, ...p }));
    fe.clear(...Object.keys(p));
  };

  const cover = useImageUpload((file) => uploadImage(file, 'group-cover'));
  // NA-26: nén → presign → PUT storage; sai định dạng / > 5 MB → báo lỗi, giữ ảnh cũ
  const onFile = (file: File) =>
    cover.pick(file, {
      previous: f.coverUrl,
      apply: (coverUrl) => set({ coverUrl }),
      onInvalid: () => toast(t('coverTooLarge')),
      onError: (e) => toast(e instanceof Error ? e.message : t('coverTooLarge')),
    });

  const submit = () => {
    const errs = validateGroup(f, all);
    if (fe.check(translateErrors(errs, (e) => t(`err.${e}`, { province: f.province })))) return;
    if (save.isPending || cover.uploading) return;
    save.mutate(
      { body: formToUpsert(f), id: f.id },
      {
        onSuccess: (g) => {
          toast(f.id ? tt('updated', { name: g.name }) : tt('created', { name: g.name }));
          onClose();
        },
        onError: (e) => fe.fromApi(e, GROUP_FIELD_MAP, tt('failed')),
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
          <button
            type="button"
            className={btn.primary}
            disabled={save.isPending || cover.uploading}
            onClick={submit}
          >
            {f.id ? t('save') : t('create')}
          </button>
        </>
      }
    >
      <CoverField f={f} set={set} onFile={onFile} />
      <BasicFields
        f={f}
        set={set}
        err={fe.err}
        kind={<KindFields f={f} set={set} err={fe.err} />}
      />
      <PeopleFields f={f} set={set} people={people} err={fe.err} />
      <RoomFields
        f={f}
        set={set}
        manage={
          f.id && topics ? (
            <ManageTopics groupId={f.id} rooms={topics} sync={topicSync(setF)} />
          ) : null
        }
      />
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
  return (
    <FormBody
      key={editId}
      initial={formFromGroup(detail.data)}
      all={all}
      topics={detail.data.rooms}
      onClose={onClose}
    />
  );
}
