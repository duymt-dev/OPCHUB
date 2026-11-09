'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatDate, pageCheckState, splitGroups, subOf } from '../model';
import type { GroupLookup, MemberHandlers, MemberPermissions } from '../types';
import { CheckBox, Flag, GroupChips, MemberAvatar, StatusPill, TypeTag } from './cells';
import { RowMenu } from './row-menu';
import styles from './member-table.module.css';

interface Props {
  rows: AdminMember[];
  selected: ReadonlySet<string>;
  onToggleAll: () => void;
  groups: GroupLookup;
  h: MemberHandlers;
  can: MemberPermissions;
}

/** D-07 dạng danh sách (v4.2 / D-100: bỏ cột Khởi đầu). `data-m="tbl"`: khung bảng, ở < 768px mỗi dòng thành một thẻ */
export function MemberTable({ rows, selected, onToggleAll, groups, h, can }: Props) {
  const t = useTranslations('members');
  const ids = rows.map((r) => r.id);
  return (
    <div data-m="tbl" className={styles.tbl}>
      <div className={styles.inner}>
        <div className={`${styles.grid} ${styles.head}`}>
          <div className={styles.ck}>
            <CheckBox
              state={pageCheckState(selected, ids)}
              label={t('col.selectAll')}
              onToggle={onToggleAll}
            />
          </div>
          <span>{t('col.member')}</span>
          <span>{t('col.type')}</span>
          <span>{t('col.groups')}</span>
          <span>{t('col.role')}</span>
          <span>{t('col.date')}</span>
          <span>{t('col.status')}</span>
          <span />
        </div>
        {rows.map((m) => (
          <Row key={m.id} m={m} on={selected.has(m.id)} groups={groups} h={h} can={can} />
        ))}
      </div>
    </div>
  );
}

function Row(p: {
  m: AdminMember;
  on: boolean;
  groups: GroupLookup;
  h: MemberHandlers;
  can: MemberPermissions;
}) {
  const { m, h } = p;
  const t = useTranslations('members');
  const g = splitGroups(m.groupIds, p.groups);
  return (
    <div className={`${styles.grid} ${styles.row} ${p.on ? styles.sel : ''}`}>
      <div className={styles.ck}>
        <CheckBox
          state={p.on ? 'all' : 'none'}
          label={t('col.select', { name: m.fullName })}
          onToggle={() => h.toggle(m.id)}
        />
      </div>
      <div className={styles.who}>
        <MemberAvatar name={m.fullName} src={m.avatarUrl} size={32} />
        <button type="button" className={styles.open} onClick={() => h.open(m)}>
          <b className={styles.name}>{m.fullName}</b>
          <span className={styles.meta}>{m.email}</span>
          <span className={`${styles.meta} ${styles.phone}`}>
            <Flag country={m.country} />
            {m.phone}
          </span>
        </button>
      </div>
      <div className={styles.type}>
        <TypeTag m={m} />
        <span className={styles.sub}>{subOf(m)}</span>
      </div>
      <GroupChips chips={g.chips} more={g.more} />
      <span className={styles.regRole}>{m.persona || t('role.member')}</span>
      <span className={styles.date}>{formatDate(m.createdAt)}</span>
      <StatusPill m={m} />
      <RowMenu m={m} h={h} canEdit={p.can.edit} />
    </div>
  );
}
