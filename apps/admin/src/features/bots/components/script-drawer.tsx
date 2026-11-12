'use client';

import type { Persona } from '@opchub/shared/api-domains';
import { translateErrors, useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormErrors } from '@/lib/use-form-errors';
import { botKeys, saveScript } from '../api';
import { SCRIPT_FIELD_MAP, type ScriptField, scriptBody, scriptError } from '../model';
import type { GroupRef, ScriptForm } from '../types';
import { Switch } from './bits';
import { GroupChips, SelectField, TextField } from './fields';
import f from './form.module.css';
import s from './script-drawer.module.css';
import { ScriptLines } from './script-lines';
import { ScriptPreview } from './script-preview';
import { Sheet } from './sheet';
import { useBotOptionLabels } from '../option-labels';

interface Props {
  initial: ScriptForm;
  groups: GroupRef[];
  personas: Persona[];
  onClose: () => void;
}

/** D-40 Drawer "Kịch bản hội thoại": thông tin, nhóm đích, lượt, xem trước */
export function ScriptDrawer({ initial, groups, personas, onClose }: Props) {
  const t = useTranslations('bots');
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);
  const fe = useFormErrors<ScriptField>();
  const set =
    <K extends keyof ScriptForm>(k: K) =>
    (v: ScriptForm[K]) => {
      setForm((x) => ({ ...x, [k]: v }));
      fe.clear(k);
    };

  const save = useMutation({
    mutationFn: () => saveScript(form.id, scriptBody(form)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: botKeys.scripts() });
      toast(t('script.saved'));
      onClose();
    },
    onError: (e) => fe.fromApi(e, SCRIPT_FIELD_MAP, t('disabled')),
  });
  const submit = () => {
    if (fe.check(translateErrors(scriptError(form), (e) => t(`sf.${e}`)))) return;
    save.mutate();
  };

  return (
    <Sheet
      wide
      title={t('sf.title')}
      closeLabel={t('close')}
      cancelLabel={t('sf.cancel')}
      saveLabel={t('sf.save')}
      saving={save.isPending}
      onClose={onClose}
      onSave={submit}
    >
      <div className={s.grid}>
        <div className={`${f.col} ${s.form}`}>
          <TextField
            label={t('sf.topic')}
            value={form.topic}
            onChange={set('topic')}
            placeholder={t('sf.topicPh')}
            error={fe.err('topic')}
          />
          <TimingFields form={form} set={set} />
          <InviteToggle on={form.inviteReal} onChange={() => set('inviteReal')(!form.inviteReal)} />
          <div className={`${s.block} ${s.blockGroups}`}>
            {t('sf.groups')}
            <GroupChips
              groups={groups}
              value={form.groupIds}
              onChange={set('groupIds')}
              label={t('sf.groups')}
              error={fe.err('groupIds')}
            />
          </div>
          <ScriptLines
            lines={form.lines}
            personas={personas}
            onChange={set('lines')}
            error={fe.err('lines')}
          />
        </div>
        <ScriptPreview lines={form.lines} personas={personas} />
      </div>
    </Sheet>
  );
}

type Setter = <K extends keyof ScriptForm>(k: K) => (v: ScriptForm[K]) => void;

/** Loại, độ trễ giữa lượt, thời điểm chạy */
function TimingFields({ form, set }: { form: ScriptForm; set: Setter }) {
  const t = useTranslations('bots');
  const options = useBotOptionLabels();
  return (
    <>
      <div className={f.two}>
        <SelectField
          label={t('sf.type')}
          value={form.type}
          onChange={set('type')}
          options={options.scriptTypes}
        />
        <TextField
          label={t('sf.delay')}
          type="number"
          min={1}
          max={60}
          value={form.delayMinutes}
          onChange={set('delayMinutes')}
        />
      </div>
      <TextField
        label={t('sf.rotationAt')}
        type="datetime-local"
        value={form.runAt}
        onChange={set('runAt')}
      />
    </>
  );
}

function InviteToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  const t = useTranslations('bots.sf');
  return (
    <div className={s.invite}>
      <Switch on={on} label={t('invite')} onChange={onChange} />
      <div className={s.inviteText}>
        <span className={s.inviteTitle}>{t('invite')}</span>
        <span className={s.inviteDesc}>{t('inviteDesc')}</span>
      </div>
    </div>
  );
}
