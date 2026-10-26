'use client';

import type { MyNeeds, Need } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { PAYWALL_PATHS, openInPlace } from '@/features/membership';
import { formatDay, dueText, locationOf } from '../model';
import { TypeChip } from './need-bits';
import styles from './mine.module.css';
import base from './needs.module.css';

/** TK Cá nhân (403) / DN chưa có gian hàng do chưa đóng phí — copy prototype `nd.noStore` */
export function NeedsLocked({ kind }: { kind: 'pay' | 'biz' }) {
  const t = useTranslations('needs.mine');
  return (
    <div className={`${base.card} ${styles.locked}`}>
      <span className={styles.lockedTitle}>{t(kind === 'pay' ? 'payTitle' : 'bizTitle')}</span>
      <span className={styles.lockedText}>{t(kind === 'pay' ? 'payText' : 'bizText')}</span>
      {kind === 'pay' ? (
        <button
          type="button"
          className={styles.lockedBtn}
          onClick={() => openInPlace(PAYWALL_PATHS.pay)}
        >
          {t('payBtn')}
        </button>
      ) : null}
    </div>
  );
}

interface RowProps {
  n: Need;
  busy: boolean;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (n: Need) => void;
}

function MineRow({ n, busy, onClose, onReopen, onDelete }: RowProps) {
  const t = useTranslations('needs');
  const due = dueText(n, { due: t('due'), none: t('noDue') });
  return (
    <div className={styles.row} data-need={n.id}>
      <div className={styles.rowMain}>
        <div className={styles.rowTags}>
          <TypeChip type={n.type} />
          <span className={base.status} data-status={n.status}>
            {t(`status.${n.status}`)}
          </span>
          <span className={base.muted}>
            {t('mine.posted', { date: formatDay(n.updatedAt), due })}
          </span>
        </div>
        <span className={styles.rowTitle}>{n.title}</span>
        <span className={styles.rowSub}>
          {t('mine.scaleLoc', { qty: n.quantity || '—', loc: locationOf(n) })}
        </span>
      </div>
      <div className={styles.rowActions}>
        {n.status === 'open' ? (
          <button
            type="button"
            className={styles.link}
            disabled={busy}
            onClick={() => onClose(n.id)}
          >
            {t('mine.close')}
          </button>
        ) : null}
        {n.status === 'closed' ? (
          <button
            type="button"
            className={styles.link}
            disabled={busy}
            onClick={() => onReopen(n.id)}
          >
            {t('mine.reopen')}
          </button>
        ) : null}
        {n.status === 'hidden' ? <span className={base.muted}>{t('mine.hidden')}</span> : null}
        <button
          type="button"
          className={`${styles.link} ${styles.danger}`}
          disabled={busy}
          onClick={() => onDelete(n)}
        >
          {t('mine.delete')}
        </button>
      </div>
    </div>
  );
}

interface Props {
  q: { data: MyNeeds | undefined; isError: boolean; refetch: () => unknown };
  locked: 'pay' | 'biz' | null;
  busy: boolean;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (n: Need) => void;
}

/** Tab "Nhu cầu của tôi" (P-113): đóng / mở lại / xoá; nhu cầu Admin ẩn chỉ xoá được ở server */
export function NeedsMine({ q, locked, ...row }: Props) {
  const t = useTranslations('needs.mine');
  const tState = useTranslations('common.state');
  if (locked) return <NeedsLocked kind={locked} />;
  if (q.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void q.refetch()}
      />
    );
  if (!q.data) return <PageSkeleton />;
  if (!q.data.store) return <NeedsLocked kind="pay" />;
  return (
    <div className={base.card}>
      {q.data.items.map((n) => (
        <MineRow key={n.id} n={n} {...row} />
      ))}
      {q.data.items.length === 0 ? <div className={base.empty}>{t('empty')}</div> : null}
    </div>
  );
}
