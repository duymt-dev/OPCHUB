'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRoles } from '../hooks/use-roles';
import type { AskConfirm } from '../types';
import { RoleCards } from './role-cards';
import { RoleMatrixTable } from './role-matrix';
import { RolePreviewSelect } from './role-preview-select';
import styles from './roles.module.css';
import ui from './settings.module.css';

/**
 * RB-R04, R05, R09 "Vai trò & phân quyền": xem thử theo vai trò, thêm / xoá vai trò tự tạo,
 * ma trận 25 khoá; "Lưu" → xác nhận → áp ngay (NA-28).
 */
export function RolesTab({ ask }: { ask: AskConfirm }) {
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');
  const r = useRoles(ask);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const closeAdd = () => {
    setAdding(false);
    setName('');
    setDesc('');
  };

  return (
    <section className={ui.card}>
      <div className={styles.headRow}>
        <div className={ui.head}>
          <div className={ui.h16}>{t('heading')}</div>
          <div className={ui.muted}>{t('headingSub')}</div>
        </div>
        {r.canEdit ? <RolePreviewSelect roles={r.roles} /> : null}
        <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>
          {t('add')}
        </button>
        <button type="button" className={ui.btnPrimary} onClick={r.save}>
          {c('save')}
        </button>
      </div>
      {adding ? (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={name}
            placeholder={t('addName')}
            aria-label={t('addName')}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={styles.addInput}
            value={desc}
            placeholder={t('addDesc')}
            aria-label={t('addDesc')}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="button" className={styles.addCancel} onClick={closeAdd}>
            {t('addCancel')}
          </button>
          <button
            type="button"
            className={styles.addOk}
            onClick={() => r.add(name, desc, closeAdd)}
          >
            {t('addOk')}
          </button>
        </div>
      ) : null}
      <RoleCards roles={r.roles} onDelete={r.remove} />
      <RoleMatrixTable roles={r.roles} matrix={r.matrix} canEdit={r.canEdit} onToggle={r.toggle} />
    </section>
  );
}
