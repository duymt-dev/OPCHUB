'use client';

import type { DeclarationDraft } from '@opchub/shared/api';
import { registrationRoles } from '@opchub/shared/fixtures';
import { RolePicker } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDeclarationSave } from '../hooks/use-declaration-save';
import { validatePersonal } from '../model';
import { DeclarationFrame } from './declaration-frame';
import { OpcPicker } from './opc-picker';
import styles from './declaration.module.css';

/** P-100: popup "Hoàn tất thông tin tham gia" — điền sẵn vai trò + nhóm đã chọn lúc đăng ký */
export function PersonalDeclaration({
  name,
  draft,
  onLogout,
}: {
  name: string;
  draft: DeclarationDraft | undefined;
  onLogout: () => void;
}) {
  const t = useTranslations('declaration');
  const s = useDeclarationSave('personal.saved');
  const [persona, setPersonaRaw] = useState(draft?.persona ?? '');
  const [groupIds, setGroupsRaw] = useState<string[]>(draft?.groupIds ?? []);
  const setPersona = (id: string) => {
    setPersonaRaw(id);
    s.clear('persona');
    // Prototype: chọn vai trò khi chưa chọn OPC → gợi ý nhóm của vai trò
    const role = registrationRoles.find((r) => r.id === id);
    if (!groupIds.length && role) setGroupsRaw([...role.suggest]);
  };
  const setGroups = (ids: string[]) => (setGroupsRaw(ids), s.clear('groups'));

  const save = () => {
    const bad = validatePersonal(persona, groupIds);
    if (bad) return s.reject(bad.key, bad.msg);
    void s.submit({ accountType: 'personal', persona, groupIds });
  };

  return (
    <DeclarationFrame
      label="Popup · Thông tin cá nhân"
      doneStep={t('steps.account')}
      currentStep={t('steps.personal')}
      title={t('personal.title')}
      intro={t('personal.intro', { name })}
      busy={s.busy}
      onLogout={onLogout}
      onSave={save}
    >
      <div className={styles.body}>
        <RolePicker
          title={t('personal.persona')}
          roles={registrationRoles}
          value={persona}
          onChange={setPersona}
          error={s.err('persona')}
        />
        <OpcPicker selected={groupIds} onChange={setGroups} error={s.err('groups')} />
      </div>
    </DeclarationFrame>
  );
}
