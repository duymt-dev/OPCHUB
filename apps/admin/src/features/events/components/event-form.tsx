'use client';

import { RichTextField, translateErrors, useImageUpload, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { uploadImage } from '@/lib/upload-image';
import { useFormErrors } from '@/lib/use-form-errors';
import { useGroupOptions, useSaveEvent } from '../hooks/use-events';
import { EVENT_DESCRIPTION_DEFAULT } from '../content-defaults';
import {
  EVENT_FIELD_MAP,
  emptyEventForm,
  formFromEvent,
  formToUpsert,
  validateEvent,
} from '../model';
import type { EventField, EventFormState, EventView } from '../types';
import styles from './event-form.module.css';
import { BasicFields, CoverField, RegSwitch, SeatsFields } from './event-form-fields';
import { MeetField, PlaceFields } from './event-place-fields';
import { Sheet } from './sheet';
import btn from './sheet.module.css';
import { useAdminUiLabels } from '@/i18n/ui-labels';

/** `new` = tạo mới; sự kiện = sửa */
export type EventFormTarget = 'new' | EventView | null;

function FormBody({ initial, onClose }: { initial: EventFormState; onClose: () => void }) {
  const ui = useAdminUiLabels();
  const t = useTranslations('events');
  const toast = useToast();
  const save = useSaveEvent();
  const groups = useGroupOptions(true).data ?? [];
  const [f, setF] = useState(initial);
  const fe = useFormErrors<EventField>();
  const set = (p: Partial<EventFormState>) => {
    setF((s) => ({ ...s, ...p }));
    // Sửa ô → xoá lỗi ô đó; đổi hình thức → ô địa điểm/link đổi nghĩa
    fe.clear(...Object.keys(p), ...('mode' in p ? ['place', 'address', 'map'] : []));
  };

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
    const errs = validateEvent(f);
    if (fe.check(translateErrors(errs, (e) => t(`errors.${e}`)))) return;
    if (save.isPending || cover.uploading) return;
    const body = formToUpsert(f, EVENT_DESCRIPTION_DEFAULT);
    save.mutate(
      { body, id: f.id },
      {
        onSuccess: (e) => {
          toast(f.id ? t('toast.updated') : t('toast.created', { title: e.title }));
          onClose();
        },
        onError: (e) => fe.fromApi(e, EVENT_FIELD_MAP, t('errors.save')),
      },
    );
  };

  return (
    <>
      <div className={styles.body}>
        <CoverField f={f} set={set} onFile={onFile} />
        <BasicFields f={f} set={set} err={fe.err} />
        <PlaceFields f={f} set={set} err={fe.err} />
        <MeetField f={f} set={set} err={fe.err} />
        <SeatsFields f={f} set={set} groups={groups} />
        <div className={styles.field}>
          {t('form.desc')}
          <RichTextField
            labels={ui.editor}
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
