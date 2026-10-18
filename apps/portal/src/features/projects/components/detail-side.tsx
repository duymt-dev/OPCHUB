'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { fmtNumber, repoName, vnDate } from '../model';
import { useRepoAccess } from '../hooks/use-project-actions';
import { Face, Mono } from './bits';
import { OwnerContactActions } from './detail-contact';
import styles from './detail-side.module.css';

const GH =
  'M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0023.5 12C23.5 5.7 18.3.5 12 .5z';
const GL: [string, string][] = [
  ['#E24329', 'M12 22.3l4.4-13.6H7.6z'],
  ['#FC6D26', 'M12 22.3L7.6 8.7H1.4z'],
  ['#FCA326', 'M1.4 8.7L.1 12.8c-.1.4 0 .8.3 1L12 22.3z'],
  ['#E24329', 'M1.4 8.7h6.2L4.9.6c-.1-.4-.7-.4-.9 0z'],
  ['#FC6D26', 'M12 22.3l4.4-13.6h6.2z'],
  ['#FCA326', 'M22.6 8.7l1.3 4.1c.1.4 0 .8-.3 1L12 22.3z'],
  ['#E24329', 'M22.6 8.7h-6.2L19.1.6c.1-.4.7-.4.9 0z'],
];

/** Biểu tượng GitHub / GitLab (dùng cả trong form) */
export function RepoIcon({
  provider,
  size,
  color,
}: {
  provider: 'github' | 'gitlab';
  size: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={styles.repoIcon} aria-hidden>
      {provider === 'github' ? (
        <path fill={color ?? '#181717'} d={GH} />
      ) : (
        GL.map(([fill, d]) => <path key={d} fill={fill} d={d} />)
      )}
    </svg>
  );
}

export function OwnerCard({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  return (
    <section className={styles.side}>
      <div className={styles.ownerRow}>
        <Face name={p.ownerName} src={p.ownerAvatarUrl} size={48} />
        <div className={styles.col}>
          <span className={styles.ownerName}>{p.ownerName}</span>
          <span className={styles.muted12}>{t('ownerSub', { country: p.country })}</span>
        </div>
      </div>
      <OwnerContactActions p={p} />
    </section>
  );
}

export function InfoCard({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects');
  const rows = [
    [t('detail.infoCategory'), p.category],
    [t('detail.infoStage'), t(`stage.${p.stage}`)],
    [t('detail.infoCountry'), p.country],
    [t('detail.infoGroup'), p.groupName],
    [t('detail.infoPublished'), vnDate(p.createdAt)],
    [t('detail.infoFollowers'), fmtNumber(p.followers)],
  ];
  return (
    <section className={`${styles.side} ${styles.gap12}`}>
      <div className={styles.sideTitle}>{t('detail.info')}</div>
      {rows.map(([l, v]) => (
        <div key={l} className={styles.kv}>
          <span className={styles.kvL}>{l}</span>
          <span className={styles.kvV}>{v}</span>
        </div>
      ))}
      <a className={styles.webBtn} href={p.website ?? '#'} target="_blank" rel="noreferrer">
        {t('detail.website')}
      </a>
    </section>
  );
}

export function RepoCard({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.repo');
  const access = useRepoAccess(p.id, p.ownerName);
  const r = p.repo;
  const priv = r?.visibility === 'private';
  const provLabel = r?.provider === 'gitlab' ? 'GitLab' : 'GitHub';
  const isPublic = p.visibility === 'public';
  return (
    <section className={`${styles.side} ${styles.gap12}`}>
      <div className={styles.repoHead}>
        <span className={styles.sideTitleFlex}>{t('title')}</span>
        <span className={`${styles.smallTag} ${isPublic ? styles.tagBlue : styles.tagOrange}`}>
          {isPublic ? t('publicProject') : t('privateProject')}
        </span>
      </div>
      {p.testUrl ? (
        <>
          <a
            className={styles.primaryLink}
            href={p.testUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('tryTest')}
          </a>
          <span className={styles.testUrl}>{p.testUrl}</span>
        </>
      ) : null}
      {r ? (
        <>
          <div className={styles.repoBox}>
            <RepoIcon provider={r.provider} size={22} />
            <div className={styles.repoText}>
              <span className={styles.repoName}>{repoName(r.url)}</span>
              <span className={styles.muted12}>{provLabel}</span>
            </div>
            <span
              className={`${styles.smallTag} ${styles.tagSm} ${priv ? styles.tagOrange : styles.tagGreen}`}
            >
              {priv ? t('private') : t('public')}
            </span>
          </div>
          {!priv || p.isOwner ? (
            <a
              className={styles.outlineLink}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('viewSource')}
            </a>
          ) : (
            <>
              <button
                type="button"
                className={`${styles.reqBtn} ${p.repoAccessRequested ? styles.reqDone : ''}`}
                onClick={() => !p.repoAccessRequested && access.mutate()}
              >
                {p.repoAccessRequested ? t('requested') : t('request')}
              </button>
              <span className={styles.muted12}>{t('privateHint', { provider: provLabel })}</span>
            </>
          )}
        </>
      ) : (
        <span className={styles.muted12}>{t('none')}</span>
      )}
    </section>
  );
}

export function RelatedCard({ p, onOpen }: { p: ProjectDetail; onOpen: (id: string) => void }) {
  const t = useTranslations('projects.detail');
  return (
    <section className={`${styles.side} ${styles.gap12}`}>
      <div className={styles.sideTitle}>{t('related')}</div>
      {p.related.map((r) => (
        <button key={r.id} type="button" className={styles.related} onClick={() => onOpen(r.id)}>
          <Mono name={r.name} tone={r.tone} size={36} />
          <span className={styles.relText}>
            <span className={styles.relName}>{r.name}</span>
            <span className={styles.muted12}>{r.category}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
