'use client';

import type { ProjectDetail } from '@opchub/shared/api-domains';
import { SafeHtml } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { Face, Mono, Pic } from './bits';
import styles from './detail-tabs.module.css';

const isHtml = (s: string) => /<[a-z]/i.test(s);

/** Tab "Tổng quan": giới thiệu (HTML đã lọc), điểm nổi bật, hình ảnh */
export function OverviewTab({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelTitle}>{t('intro')}</div>
        <div className={styles.long}>
          {isHtml(p.description) ? (
            <SafeHtml html={p.description} />
          ) : (
            <div className={styles.pre}>{p.description}</div>
          )}
        </div>
        {p.highlights.length ? (
          <div className={styles.highlights}>
            {p.highlights.map((h) => (
              <div key={h.title} className={styles.highlight}>
                <span className={styles.hlTitle}>{h.title}</span>
                <span className={styles.hlBody}>{h.body}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {/* BUG-038: khối rỗng thì ẩn (chưa có nguồn nhập điểm nổi bật / thư viện ảnh) */}
      {p.gallery.length ? (
        <section className={styles.panel}>
          <div className={styles.panelTitle}>{t('gallery')}</div>
          <div className={styles.gallery}>
            {p.gallery.map((g) => (
              <div key={g} className={styles.galleryItem}>
                <Pic src={g} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Tab "Cập nhật": dòng thời gian */
export function UpdatesTab({ p }: { p: ProjectDetail }) {
  return (
    <section className={`${styles.panel} ${styles.timeline}`}>
      {p.updates.map((u, i) => (
        <div key={`${u.date}-${u.title}-${i}`} className={styles.tlRow}>
          <div className={styles.tlRail}>
            <i className={`${styles.tlDot} ${styles[`tl_${u.tone}`] ?? ''}`} />
            <i className={styles.tlLine} />
          </div>
          <div className={styles.tlText}>
            <span className={styles.tlDate}>{u.date}</span>
            <span className={styles.tlTitle}>{u.title}</span>
            <span className={styles.tlBody}>{u.body}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Tab "Đội ngũ" */
export function TeamTab({ p }: { p: ProjectDetail }) {
  const t = useTranslations('projects.detail');
  return (
    <section className={`${styles.panel} ${styles.teamGrid}`}>
      {p.team.map((m) => (
        <div key={m.name} className={styles.member}>
          <Face name={m.name} src={m.avatarUrl} size={56} />
          <span className={styles.memberName}>{m.name}</span>
          <span className={styles.memberRole}>{m.role || t('memberRole')}</span>
        </div>
      ))}
    </section>
  );
}

/** V4-610 (prototype v4): tab "Dự án liên quan" — lưới thẻ nhỏ thay khối ở cột phải */
export function RelatedTab({ p, onOpen }: { p: ProjectDetail; onOpen: (id: string) => void }) {
  return (
    <section className={`${styles.panel} ${styles.relGrid}`}>
      {p.related.map((r) => (
        <button key={r.id} type="button" className={styles.related} onClick={() => onOpen(r.id)}>
          <Mono name={r.name} tone={r.tone} size={36} />
          <span className={styles.relText}>
            <span className={styles.relName}>{r.name}</span>
            <span className={styles.relCat}>{r.category}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
