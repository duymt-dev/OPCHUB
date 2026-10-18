'use client';

import { RichTextField, useImageUpload, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { uploadImage } from '@/lib/upload-image';
import { useGroupOptions, useSaveEvent } from '../hooks/use-events';
import { emptyEventForm, formFromEvent, formToUpsert, validateEvent } from '../model';
import type { EventFormState, EventView } from '../types';
import styles from './event-form.module.css';
import { BasicFields, CoverField, PlaceFields, RegSwitch, SeatsFields } from './event-form-fields';
import { Sheet } from './sheet';
import btn from './sheet.module.css';

/** `new` = tạo mới; sự kiện = sửa */
export type EventFormTarget = 'new' | EventView | null;

function FormBody({ initial, onClose }: { initial: EventFormState; onClose: () => void }) {
  const t = useTranslations('events');
  const toast = useToast();
  const save = useSaveEvent();
  const groups = useGroupOptions(true).data ?? [];
  const [f, setF] = useState(initial);
  const set = (p: Partial<EventFormState>) => setF((s) => ({ ...s, ...p }));

  const cover = useImageUpload((file) => uploadImage(file, 'event-cover'));
  // NA-26: nén → presign → PUT storage; sai định dạng / > 5 MB → báo lỗi, giữ ảnh cũ
  const onFile = (file: File) =>
    cover.pick(file, {
      previous: f.coverUrl,
      apply: (coverUrl) => set({ coverUrl }),
      onInvalid: (p) => toast(t(p === 'type' ? 'errors.coverType' : 'errors.coverSize')),
      onError: (e) => toast(e instanceof Error ? e.message : t('errors.coverType')),
    });

  const submit = () => {
    const err = validateEvent(f);
    if (err) return toast(t(`errors.${err}`));
    if (save.isPending || cover.uploading) return;
    const body = formToUpsert(f, t('form.descDefault'));
    save.mutate(
      { body, id: f.id },
      {
        onSuccess: (e) => {
          toast(f.id ? t('toast.updated') : t('toast.created', { title: e.title }));
          onClose();
        },
      },
    );
  };

  return (
    <>
      <div className={styles.body}>
        <CoverField f={f} set={set} onFile={onFile} />
        <BasicFields f={f} set={set} />
        <PlaceFields f={f} set={set} />
        <SeatsFields f={f} set={set} groups={groups} />
        <div className={styles.field}>
          {t('form.desc')}
          <RichTextField
            value={f.description}
            onChange={(description) => set({ description })}
            placeholder={t('form.descPh')}
            ariaLabel={t('form.desc')}
            minHeight={120}
          />
        </div>
        <RegSwitch f={f} set={set} />
      </div>
      <div className={styles.foot}>
        <button type="button" className={btn.btn} onClick={onClose}>
          {t('form.cancel')}
        </button>
        <button
          type="button"
          className={btn.primary}
          disabled={save.isPending || cover.uploading}
          onClick={submit}
        >
          {t('form.save')}
        </button>
      </div>
    </>
  );
}

/** D-47 → D-49: drawer Tạo / Chỉnh sửa sự kiện (Offline / Online) */
export function EventForm({ target, onClose }: { target: EventFormTarget; onClose: () => void }) {
  const t = useTranslations('events.form');
  const editing = target && target !== 'new' ? target : null;
  return (
    <Sheet
      open={!!target}
      width="wide"
      title={editing ? t('editTitle') : t('createTitle')}
      closeLabel={t('close')}
      onClose={onClose}
    >
      {target ? (
        <FormBody
          key={editing?.id ?? 'new'}
          initial={editing ? formFromEvent(editing) : emptyEventForm()}
          onClose={onClose}
        />
      ) : null}
    </Sheet>
  );
}
