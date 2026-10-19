'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatDate, splitGroups, subOf } from '../model';
import type { GroupLookup, MemberHandlers, MemberPermissions } from '../types';
import { CheckBox, GroupChips, MemberAvatar, StatusPill, TypeTag } from './cells';
import { RowMenu } from './row-menu';
import styles from './member-grid.module.css';

interface Props {
  rows: AdminMember[];
  selected: ReadonlySet<string>;
  groups: GroupLookup;
  h: MemberHandlers;
  can: MemberPermissions;
}

/** D-08 dạng lưới: thẻ 250px, chọn / menu ⋯ / "Xem hồ sơ đăng ký →" */
export function MemberGrid({ rows, selected, groups, h, can }: Props) {
  const t = useTranslations('members');
  return (
    <div className={styles.grid}>
      {rows.map((m) => {
        const on = selected.has(m.id);
        const g = splitGroups(m.groupIds, groups);
        return (
          <article key={m.id} className={`${styles.card} ${on ? styles.sel : ''}`}>
            <div className={styles.top}>
              <CheckBox
                state={on ? 'all' : 'none'}
                label={t('col.select', { name: m.fullName })}
                onToggle={() => h.toggle(m.id)}
              />
              <div className={styles.right}>
                <StatusPill m={m} className={styles.status} />
                <RowMenu m={m} h={h} canEdit={can.edit} />
              </div>
            </div>
            <div className={styles.body}>
              <MemberAvatar name={m.fullName} size={56} />
              <span className={styles.name}>{m.fullName}</span>
              <span className={styles.email}>{m.email}</span>
              <TypeTag m={m} />
              <span className={styles.sub}>{subOf(m)}</span>
              <button type="button" className={styles.link} onClick={() => h.open(m)}>
                {t('grid.profile')}
              </button>
            </div>
            <div className={styles.chips}>
              <GroupChips chips={g.chips} more={g.more} chipClass={styles.chip} />
            </div>
            <div className={styles.foot}>
              <span>{m.persona || t('role.member')}</span>
              <span>{t('grid.joined', { date: formatDate(m.createdAt) })}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
