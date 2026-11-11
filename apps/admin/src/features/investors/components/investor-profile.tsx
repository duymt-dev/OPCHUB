'use client';

import type { AdminInvestor } from '@opchub/shared/api-domains';
import { useLocale, useTranslations } from 'next-intl';
import { money, shortDate } from '../model';
import { InvestorAvatar, KindTag } from './tags';
import styles from './investor-drawer.module.css';

/** Đầu drawer: avatar, tên, loại + ô Doanh nghiệp / SĐT / Tổng vốn quan tâm */
export function InvestorProfile({ x }: { x: AdminInvestor }) {
  const locale = useLocale();
  const d = useTranslations('investors.drawer');
  return (
    <>
      <div className={styles.who}>
        <InvestorAvatar src={x.avatarUrl} size={36} />
        <div className={styles.whoText}>
          <b className={styles.name}>{x.name}</b>
          <KindTag kind={x.kind} className={styles.kindTag} />
        </div>
      </div>
      <div className={styles.info}>
        <div className={`${styles.cell} ${styles.wide}`}>
          <span className={styles.label}>{d('org')}</span>
          <span className={styles.value}>{x.organization}</span>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{d('phone')}</span>
          <span className={styles.value}>{x.phone}</span>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{d('total')}</span>
          <b className={`${styles.value} ${styles.money}`}>{money(x.totalAmount, 'VND', locale)}</b>
        </div>
      </div>
    </>
  );
}

/** "Dự án đã quan tâm (N)": dự án, số tiền, chủ dự án, ngày, lời nhắn */
export function InvestorProjects({ x }: { x: AdminInvestor }) {
  const locale = useLocale();
  const d = useTranslations('investors.drawer');
  return (
    <div className={styles.projects}>
      <span className={styles.h}>{d('projects', { n: x.items.length })}</span>
      {x.items.map((i) => (
        <div key={i.interestId} className={styles.item}>
          <div className={styles.itemTop}>
            <b className={styles.pname}>{i.projectName}</b>
            <span className={styles.amt}>{money(i.amount, i.currency, locale)}</span>
          </div>
          <span className={styles.owner}>
            {d('owner', { owner: i.ownerName, date: shortDate(i.createdAt, locale) })}
          </span>
          <span className={styles.msg}>{i.message}</span>
        </div>
      ))}
    </div>
  );
}
