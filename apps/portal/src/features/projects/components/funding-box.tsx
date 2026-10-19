'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { money } from '../model';
import { useThreadSend } from '../hooks/use-project-actions';
import { useInterests, useThreads } from '../hooks/use-projects';
import { Face } from './bits';
import styles from './funding.module.css';

const KIND_CLASS = { individual: styles.kBlue, business: styles.kOrange, fund: styles.kViolet };

/** P-72: chủ dự án xem nhà đầu tư quan tâm */
function InvestorList({ projectId }: { projectId: string }) {
  const t = useTranslations('projects');
  const list = useInterests(projectId, true);
  const items = list.data ?? [];
  return (
    <div className={styles.sub}>
      <span className={styles.subTitle}>{t('fund.investors', { n: items.length })}</span>
      {items.map((i) => (
        <div key={i.id} className={styles.inv}>
          <Face name={i.investorName} src={i.avatarUrl} size={32} />
          <div className={styles.invText}>
            <div className={styles.invHead}>
              <b>{i.investorName}</b>
              <span className={styles.invAmt}>{money(i.amount, i.currency)}</span>
            </div>
            <div className={styles.invMeta}>
              <span className={`${styles.kind} ${KIND_CLASS[i.kind]}`}>{t(`kind.${i.kind}`)}</span>
              <span>
                {i.organization || (i.kind === 'individual' ? t('fund.individualOrg') : '—')}
              </span>
              <span className={styles.sep}>·</span>
              <span>{i.phone || '—'}</span>
            </div>
            <span className={styles.invMsg}>{i.message}</span>
          </div>
        </div>
      ))}
      {list.data && !items.length ? (
        <span className={styles.muted}>{t('fund.noInvestors')}</span>
      ) : null}
    </div>
  );
}

const hhmm = (iso: string) => {
  const d = new Date(Date.parse(iso) + 7 * 36e5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} · ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
};

/**
 * P-71, IV-R02: MỘT luồng trao đổi nhà đầu tư ↔ Admin OPC Hub, giống nhau ở mọi dự án đã quan tâm
 * (phần tử duy nhất của `/me/investor-thread`); gửi bằng `threadKey` của dự án đang xem.
 */
function Thread({ threadKey }: { threadKey: string }) {
  const t = useTranslations('projects.fund');
  const toast = useToast();
  const threads = useThreads(true);
  const send = useThreadSend();
  const [text, setText] = useState('');
  const msgs = threads.data?.[0]?.messages ?? [];
  const submit = () => {
    const body = text.trim();
    if (!body) return;
    send.mutate(
      { key: threadKey, body },
      {
        onSuccess: () => {
          setText('');
          toast(t('threadSent'));
        },
      },
    );
  };
  return (
    <div className={styles.sub}>
      <span className={styles.subTitle}>{t('thread')}</span>
      {!msgs.length ? <span className={styles.threadEmpty}>{t('threadEmpty')}</span> : null}
      {msgs.map((m) =>
        m.fromInvestor ? (
          <div key={m.id} className={styles.mine}>
            <span className={styles.time}>{hhmm(m.createdAt)}</span>
            <div className={styles.bubbleMe}>{m.body}</div>
          </div>
        ) : (
          <div key={m.id} className={styles.theirs}>
            <span className={styles.time}>
              <b>{m.senderName}</b> · {hhmm(m.createdAt)}
            </span>
            <div className={styles.bubbleAdmin}>{m.body}</div>
          </div>
        ),
      )}
      <div className={styles.compose}>
        <textarea
          rows={2}
          className={styles.composeInput}
          value={text}
          placeholder={t('threadPh')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className={`${styles.send} ${text.trim() ? '' : styles.sendIdle}`}
          onClick={submit}
        >
          {t('send')}
        </button>
      </div>
    </div>
  );
}

/** P-69 / P-71 / P-72: khối "Gọi vốn đầu tư" ở cột phải */
export function FundingBox({ p, onInterest }: { p: ProjectDetail; onInterest: () => void }) {
  const t = useTranslations('projects.fund');
  const toast = useToast();
  const f = p.funding;
  if (!f) return null;
  const pct = Math.min(100, Math.round((p.pledged / (f.amount || 1)) * 100));
  const mine = p.myInterest;
  return (
    <section className={styles.box}>
      <span className={styles.title}>{t('title')}</span>
      <div className={styles.pair}>
        <div className={styles.cell}>
          <span className={styles.cellL}>{t('need')}</span>
          <b className={styles.cellV}>{money(f.amount, f.currency)}</b>
        </div>
        <div className={styles.cell}>
          <span className={styles.cellL}>{t('equity')}</span>
          <b className={styles.cellV}>{f.equityPercent}%</b>
        </div>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressHead}>
          <span className={styles.muted}>
            {t('pledged', { amount: money(p.pledged, f.currency) })}
          </span>
          <b>{pct}%</b>
        </div>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className={styles.kv}>
        <span className={styles.muted13}>{t('min')}</span>
        <span className={styles.kvV}>
          {f.minTicket > 0 ? money(f.minTicket, f.currency) : t('noMin')}
        </span>
      </div>
      <div className={styles.kv}>
        <span className={styles.muted13}>{t('interested')}</span>
        <span className={styles.kvV}>{p.interestCount}</span>
      </div>
      {f.useOfFunds ? (
        <div className={styles.use}>
          <b>{t('use')}</b> {f.useOfFunds}
        </div>
      ) : null}
      {!p.isOwner ? (
        <button
          type="button"
          className={`${styles.cta} ${mine ? styles.ctaDone : ''}`}
          onClick={() => (mine ? toast(t('already')) : onInterest())}
        >
          {mine ? t('sent', { amount: money(mine.amount, mine.currency) }) : t('cta')}
        </button>
      ) : null}
      {mine ? <Thread threadKey={mine.threadKey} /> : null}
      {p.isOwner ? <InvestorList projectId={p.id} /> : null}
      <span className={styles.disclaimer}>{t('disclaimer')}</span>
    </section>
  );
}
