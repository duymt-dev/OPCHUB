'use client';

import { translateErrors, useImageUpload, useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useUploadImage } from '@/i18n/use-upload-image';
import { useFormErrors } from '@/lib/use-form-errors';
import { botKeys, savePersona } from '../api';
import { PERSONA_FIELD_MAP, type PersonaField, personaBody, personaError } from '../model';
import type { GroupRef, PersonaForm } from '../types';
import { GroupChips } from './fields';
import f from './form.module.css';
import { PersonaBasicFields, PersonaStyleFields } from './persona-fields';
import { PersonaPhoto } from './persona-photo';
import { Sheet } from './sheet';

interface Props {
  initial: PersonaForm;
  groups: GroupRef[];
  onClose: () => void;
}

/** D-38 Drawer "Persona": ảnh/màu, thông tin cơ bản, phong cách, nhóm tham gia */
export function PersonaDrawer({ initial, groups, onClose }: Props) {
  const uploadImage = useUploadImage();
  const t = useTranslations('bots');
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);
  const fe = useFormErrors<PersonaField>();
  const set =
    <K extends keyof PersonaForm>(k: K) =>
    (v: PersonaForm[K]) => {
      setForm((x) => ({ ...x, [k]: v }));
      fe.clear(k);
    };

  const save = useMutation({
    mutationFn: () => savePersona(form.id, personaBody(form)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botKeys.personas() });
      toast(t('persona.saved'));
      onClose();
    },
    onError: (e) => fe.fromApi(e, PERSONA_FIELD_MAP, t('disabled')),
  });
  const photo = useImageUpload((file) => uploadImage(file, 'persona-avatar'));
  const onFile = (file: File) =>
    photo.pick(file, {
      previous: form.avatarUrl,
      apply: set('avatarUrl'),
      onInvalid: () => toast(t('pf.badPhoto')),
      onError: (e) => toast(e instanceof Error ? e.message : t('pf.badPhoto')),
    });
  const submit = () => {
    if (photo.uploading) return;
    if (fe.check(translateErrors(personaError(form), (e) => t(`pf.${e}`)))) return;
    save.mutate();
  };

  return (
    <Sheet
      title={t('pf.title')}
      closeLabel={t('close')}
      cancelLabel={t('pf.cancel')}
      saveLabel={t('pf.save')}
      saving={save.isPending || photo.uploading}
      onClose={onClose}
      onSave={submit}
    >
      <div className={f.col}>
        <PersonaPhoto
          name={form.name}
          color={form.color}
          photo={form.avatarUrl}
          onColor={set('color')}
          onPhoto={set('avatarUrl')}
          onFile={onFile}
        />
        <PersonaBasicFields form={form} set={set} err={fe.err} />
        <PersonaStyleFields form={form} set={set} />
        <div className={f.section}>{t('pf.groups')}</div>
        <GroupChips
          groups={groups}
          value={form.groupIds}
          onChange={set('groupIds')}
          label={t('pf.groups')}
          error={fe.err('groupIds')}
        />
      </div>
    </Sheet>
  );
}
