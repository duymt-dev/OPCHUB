'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { formatDate, splitGroups } from '../model';
import type { GroupLookup } from '../types';
import { Flag, MemberAvatar, TypeTag, useStatusLabel } from './cells';
import styles from './member-drawer.module.css';

type Row = [label: string, value: string];

function useProfileRows(m: AdminMember) {
  const t = useTranslations('members.drawer');
  const tRole = useTranslations('members.role');
  const status = useStatusLabel();
  const b = m.business;
  const biz: Row[] = b
    ? [
        [t('taxCode'), b.taxCode],
        [t('company'), b.companyName],
        [t('field'), b.field],
        [t('size'), b.size],
        [t('country'), b.country],
      ]
    : [];
  const person: Row[] = [
    [t('name'), m.fullName],
    b ? [t('position'), b.position] : [t('persona'), m.persona],
    [t('phone'), m.phone],
    [t('email'), m.email],
  ];
  const sys: Row[] = [
    [t('registered'), formatDate(m.createdAt)],
    [t('role'), tRole(m.systemRole)],
    [t('status'), status(m)],
  ];
  return { biz, person, sys };
}

/** Nội dung drawer "Hồ sơ đăng ký": DN / người đại diện hoặc cá nhân, nhóm, hệ thống */
export function MemberProfile({ m, groups }: { m: AdminMember; groups: GroupLookup }) {
  const t = useTranslations('members.drawer');
  const rows = useProfileRows(m);
  return (
    <div className={styles.body}>
      <div className={styles.who}>
        <MemberAvatar name={m.fullName} size={56} />
        <div className={styles.whoText}>
          <span className={styles.name}>{m.fullName}</span>
          <div className={styles.tags}>
            <TypeTag m={m} long />
            <Flag country={m.country} large />
          </div>
        </div>
      </div>
      {m.business ? <Section title={t('biz')} rows={rows.biz} /> : null}
      <Section title={m.business ? t('rep') : t('per')} rows={rows.person} />
      <div className={styles.groups}>
        <span className={styles.groupsTitle}>{t('groups')}</span>
        <div className={styles.chips}>
          {splitGroups(m.groupIds, groups, Infinity).all.map((g) => (
            // Màu chip theo nhóm (dữ liệu tone), không phải token giao diện
            <span key={g.id} className={styles.chip} style={{ background: g.bg, color: g.fg }}>
              {g.name}
            </span>
          ))}
        </div>
      </div>
      <Section title={t('sys')} rows={rows.sys} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {rows.map(([l, v]) => (
        <div key={l} className={styles.row}>
          <span className={styles.label}>{l}</span>
          <span className={styles.value}>{v || '—'}</span>
        </div>
      ))}
    </section>
  );
}
