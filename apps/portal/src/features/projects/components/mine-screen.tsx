'use client';

import type { ProjectCard } from '@opchub/shared/api-domains';
import { ErrorState, PageSkeleton, SafeHtml } from '@opchub/ui';
import { FundRejected } from '@/features/fundraising';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { mineView, STATUS_TONE, vnDate } from '../model';
import { useMyProjects, useProjectStats } from '../hooks/use-projects';
import { Pic, Tag } from './bits';
import styles from './mine.module.css';
import { useProjectsUi } from './projects-context';
import { ScopeTabs } from './projects-header';

function MineRow({ p }: { p: ProjectCard }) {
  const t = useTranslations('projects');
  const router = useRouter();
  const ui = useProjectsUi();
  const live = p.status === 'published';
  const v = mineView(p);
  const view = () => live && router.push(`/projects/${encodeURIComponent(p.id)}`);
  return (
    <div
      className={`${styles.row} ${live ? styles.rowLink : ''}`}
      role={live ? 'link' : undefined}
      tabIndex={live ? 0 : undefined}
      onClick={view}
      onKeyDown={(e) => e.key === 'Enter' && view()}
    >
      <div className={styles.thumb}>
        <Pic src={p.coverUrl} />
      </div>
      <div className={styles.text}>
        <div className={styles.titleLine}>
          <span className={styles.name}>{p.name}</span>
          <Tag tone={v.revision ? STATUS_TONE.pending_review : STATUS_TONE[p.status]}>
            {v.revision
              ? t('mine.withRevision', {
                  status: t(`status.${p.status}`),
                  revision: t(`revision.${v.revision}`),
                })
              : t(`status.${p.status}`)}
          </Tag>
        </div>
        <span className={styles.short}>{p.summary}</span>
        <span className={styles.meta}>
          {t('mine.meta', {
            category: p.category,
            stage: t(`stage.${p.stage}`),
            visibility: t(`mine.${p.visibility}`),
            date: vnDate(p.updatedAt),
          })}
        </span>
        {v.note ? (
          <div className={`${styles.note} ${v.note.rejected ? styles.noteRed : ''}`}>
            <b>{v.note.rejected ? t('mine.rejectNote') : t('mine.changesNote')}:</b>{' '}
            <SafeHtml html={v.note.html} className={`rich ${styles.noteBody}`} />
          </div>
        ) : null}
        {p.fundraising?.status === 'rejected' ? <FundRejected fundraising={p.fundraising} /> : null}
      </div>
      <div className={styles.actions}>
        {v.editable ? (
          <button
            type="button"
            className={styles.edit}
            onClick={(e) => {
              e.stopPropagation();
              ui.openEdit(p.id);
            }}
          >
            {t('mine.edit')}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.share}
          onClick={(e) => {
            e.stopPropagation();
            ui.openShare({ id: p.id, name: p.name });
          }}
        >
          {t('mine.share')}
        </button>
      </div>
    </div>
  );
}

/** P-60 / P-61: Dự án của tôi — mọi trạng thái (§8), ghi chú duyệt, sửa, chia sẻ */
export function MineScreen() {
  const t = useTranslations('projects.empty');
  const tState = useTranslations('common.state');
  const router = useRouter();
  const ui = useProjectsUi();
  const mine = useMyProjects();
  const stats = useProjectStats();

  if (mine.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void mine.refetch()}
      />
    );
  if (!mine.data) return <PageSkeleton />;

  return (
    <div className={styles.screen}>
      <ScopeTabs
        active="mine"
        exploreCount={stats.data?.total ?? 0}
        mineCount={mine.data.length}
        onScope={(k) => k === 'explore' && router.push('/projects')}
        onNew={ui.openNew}
      />
      {mine.data.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>{t('mineTitle')}</div>
          <div className={styles.emptyBody}>{t('mineBody')}</div>
          <button type="button" className={styles.emptyCta} onClick={ui.openNew}>
            {t('mineCta')}
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {mine.data.map((p) => (
            <MineRow key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
