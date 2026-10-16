'use client';

import { RichTextField, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useGroupOptions, useSaveEvent } from '../hooks/use-events';
import { emptyEventForm, formFromEvent, formToUpsert, validateEvent } from '../model';
import type { EventFormState, EventView } from '../types';
import styles from './event-form.module.css';
import { BasicFields, CoverField, PlaceFields, RegSwitch, SeatsFields } from './event-form-fields';
import { Sheet } from './sheet';
import btn from './sheet.module.css';

const MAX_COVER = 5 * 1024 * 1024;
const COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Ảnh chọn từ máy → data URL (chưa có adapter storage — DV-G5a-3) */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('read')));
    r.onerror = () => reject(r.error ?? new Error('read'));
    r.readAsDataURL(file);
  });
}

/** `new` = tạo mới; sự kiện = sửa */
export type EventFormTarget = 'new' | EventView | null;

function FormBody({ initial, onClose }: { initial: EventFormState; onClose: () => void }) {
  const t = useTranslations('events');
  const toast = useToast();
  const save = useSaveEvent();
  const groups = useGroupOptions(true).data ?? [];
  const [f, setF] = useState(initial);
  const set = (p: Partial<EventFormState>) => setF((s) => ({ ...s, ...p }));

  const onFile = (file: File) => {
    if (!COVER_TYPES.includes(file.type)) return toast(t('errors.coverType'));
    if (file.size > MAX_COVER) return toast(t('errors.coverSize'));
    void readImage(file).then((url) => set({ coverUrl: url }));
  };

  const submit = () => {
    const err = validateEvent(f);
    if (err) return toast(t(`errors.${err}`));
    if (save.isPending) return;
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
        <button type="button" className={btn.primary} disabled={save.isPending} onClick={submit}>
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
