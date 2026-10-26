'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { openConsultForm, openPricingPopup } from '@/features/membership';
import { useServices } from '@/features/services';
import { nextAccordion, readOpen, writeOpen } from '../model';
import { AssistantItem } from './assistant-item';
import styles from './assistant.module.css';

const store = () => (typeof window === 'undefined' ? undefined : window.localStorage);

/** Danh sách mục đang bật (AD-09): đang tải / lỗi / rỗng / accordion */
function AssistantBody() {
  const t = useTranslations('assistant');
  const services = useServices();
  const [ac, setAc] = useState<string | null>(null);
  if (services.isPending) {
    return (
      <div className={styles.list} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.skel} />
        ))}
      </div>
    );
  }
  if (services.isError) {
    return (
      <div className={styles.state}>
        <span>{t('error')}</span>
        <button type="button" className={styles.link} onClick={() => void services.refetch()}>
          {t('retry')}
        </button>
      </div>
    );
  }
  const items = services.data;
  return (
    <div className={styles.list}>
      {items.length === 0 ? <span className={styles.state}>{t('empty')}</span> : null}
      {items.map((s) => (
        <AssistantItem
          key={s.id}
          s={s}
          open={ac === s.id}
          onToggle={() => setAc(nextAccordion(ac, s.id))}
          onConsult={() => openConsultForm(s.id)}
        />
      ))}
      <button type="button" className={styles.all} onClick={openPricingPopup}>
        {t('all')}
      </button>
    </div>
  );
}

/**
 * V4-613 Trợ lý OPC Hub (QT-13, REQ-513): khung ở chân sidebar Portal ngay trên thẻ gói (thẻ gói giữ vị trí như prototype) — đóng / mở
 * (nhớ theo trình duyệt), mở ra danh mục chương trình & dịch vụ đang bật (AD-09), mỗi mục mở form
 * tư vấn; "Xem tất cả" mở popup Gói dịch vụ. Sidebar thu gọn → ẩn cùng thẻ gói.
 */
export function AssistantPanel() {
  const t = useTranslations('assistant');
  // Khung chỉ render phía client (sau khi có phiên) nên đọc storage ngay lúc khởi tạo, như sidebar
  const [open, setOpen] = useState(() => readOpen(store()));
  const toggle = () => {
    writeOpen(store(), !open);
    setOpen(!open);
  };
  return (
    <section className={styles.card} aria-label={t('title')} data-open={open ? '1' : '0'}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-label={t(open ? 'collapse' : 'expand')}
        onClick={toggle}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.titles}>
          <span className={styles.title}>{t('title')}</span>
          {open ? <span className={styles.sub}>{t('sub')}</span> : null}
        </span>
        <svg className={styles.chev} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </button>
      {open ? <AssistantBody /> : null}
    </section>
  );
}
