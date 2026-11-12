'use client';

import type { AdminRoleRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { roleTone } from '../model';
import styles from './roles.module.css';
import { useNumberText } from '@/i18n/use-number-text';

/** Thẻ vai trò: tên (màu theo thứ tự), số TK, mô tả; "×" xoá vai trò tự tạo (AT-RB05) */
export function RoleCards({
  roles,
  onDelete,
}: {
  roles: readonly AdminRoleRow[];
  onDelete: (r: AdminRoleRow) => void;
}) {
  const numberText = useNumberText();
  const t = useTranslations('settings.roles');
  return (
    <div className={styles.cards}>
      {roles.map((r, i) => {
        const tone = roleTone(i);
        return (
          <div key={r.id} className={styles.card} data-role={r.name}>
            <div className={styles.cardTop}>
              <span className={styles.roleTag} style={{ background: tone.bg, color: tone.fg }}>
                {r.name}
              </span>
              <span className={styles.count}>
                {t('accounts', { n: numberText(r.accountCount) })}
              </span>
              {r.isSystem ? null : (
                <button
                  type="button"
                  className={styles.del}
                  title={t('delete')}
                  aria-label={`${t('delete')} ${r.name}`}
                  onClick={() => onDelete(r)}
                >
                  ×
                </button>
              )}
            </div>
            <span className={styles.desc}>{r.description}</span>
          </div>
        );
      })}
    </div>
  );
}
