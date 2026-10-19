'use client';

import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { useAdminCreate } from '../hooks/use-admin-create';
import type { AdminDraft } from '../hooks/use-admin-create';
import { isSuperRole } from '../model';
import styles from './admin-create.module.css';

type Create = ReturnType<typeof useAdminCreate>;

function Field({
  c,
  k,
  label,
  placeholder,
  required,
}: {
  c: Create;
  k: Exclude<keyof AdminDraft, 'roleId'>;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  const err = c.errors[k];
  return (
    <label className={styles.field}>
      <span>
        {required ? <span className={styles.req}>* </span> : null}
        {label}
      </span>
      <input
        className={`${styles.input} ${err ? styles.inputErr : ''}`}
        value={c.f[k]}
        placeholder={placeholder}
        aria-invalid={err ? true : undefined}
        onChange={(e) => c.set(k, e.target.value)}
      />
      {err ? <span className={styles.err}>{err}</span> : null}
    </label>
  );
}

/** Hộp thoại "Tạo tài khoản quản trị" (RB-R02, AT-RB01) — prototype ver2 `adOpen` (modal giữa màn) */
export function AdminCreateDrawer({ c, roles }: { c: Create; roles: readonly AdminRoleRow[] }) {
  const t = useTranslations('settings.admins.drawer');
  return (
    <Modal
      open={c.open}
      title={t('title')}
      onClose={c.close}
      closeLabel={t('cancel')}
      size="form"
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.foot}`} onClick={c.close}>
            {t('cancel')}
          </button>
          <button type="button" className={styles.primary} disabled={c.busy} onClick={c.submit}>
            {t('submit')}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.note}>{t.rich('sub', { b: (x) => <b>{x}</b> })}</div>
        <div className={styles.two}>
          <Field c={c} k="name" label={t('name')} placeholder={t('namePh')} required />
          <Field c={c} k="phone" label={t('phone')} placeholder={t('phonePh')} />
        </div>
        <Field c={c} k="email" label={t('email')} placeholder={t('emailPh')} required />
        <div className={styles.field}>
          <span>
            <span className={styles.req}>* </span>
            {t('role')}
          </span>
          <div className={styles.roles} role="radiogroup" aria-label={t('role')}>
            {roles
              .filter((r) => !isSuperRole(r))
              .map((r) => {
                const on = r.id === c.f.roleId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`${styles.roleCard} ${on ? styles.roleOn : ''}`}
                    onClick={() => c.set('roleId', r.id)}
                  >
                    <span className={styles.roleName}>{r.name}</span>
                    <span className={styles.roleDesc}>{r.description}</span>
                  </button>
                );
              })}
          </div>
          {c.errors.roleId ? <span className={styles.err}>{c.errors.roleId}</span> : null}
          <span className={styles.hint}>{t('roleHint')}</span>
        </div>
        <label className={styles.field}>
          <span>
            <span className={styles.req}>* </span>
            {t('password')}
          </span>
          <div className={styles.pwd}>
            <input
              className={`${styles.input} ${styles.mono} ${c.errors.password ? styles.inputErr : ''}`}
              value={c.f.password}
              aria-invalid={c.errors.password ? true : undefined}
              onChange={(e) => c.set('password', e.target.value)}
            />
            <button type="button" className={styles.btn} onClick={c.generate}>
              {t('generate')}
            </button>
          </div>
          {c.errors.password ? <span className={styles.err}>{c.errors.password}</span> : null}
          <span className={styles.hint}>{t('passwordHint')}</span>
        </label>
      </div>
    </Modal>
  );
}
