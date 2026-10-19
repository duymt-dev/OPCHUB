'use client';

import type { AdminService } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCatalogActions } from '../hooks/use-catalog-actions';
import type { ConfirmRequest } from '@opchub/ui';
import styles from './catalog-tab.module.css';

type Field = 'name' | 'model' | 'description';

/** Ô sửa tại chỗ: giữ chữ đang gõ, lưu khi rời ô nếu đổi (không gọi API mỗi phím) */
function Cell({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      className={styles.input}
      value={text}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== value && onSave(text.trim())}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

interface Props {
  rows: AdminService[];
  confirm: (req: ConfirmRequest) => void;
}

/** D-65 "Danh mục chương trình & dịch vụ" — hiển thị trong popup Gói dịch vụ của Portal */
export function CatalogTab({ rows, confirm }: Props) {
  const t = useTranslations('requests.catalog');
  const c = useTranslations('requests.confirm');
  const act = useCatalogActions();
  const save = (s: AdminService, f: Field) => (v: string) => act.patch(s.id, { [f]: v });

  const del = (s: AdminService) => {
    if (s.requestCount > 0) return act.inUse();
    confirm({
      title: c('deleteTitle'),
      body: c('deleteBody', { name: s.name || '—' }),
      okLabel: c('delete'),
      cancelLabel: c('cancel'),
      danger: true,
      onOk: () => act.remove(s.id),
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.heading}>{t('heading')}</h2>
        <span className={styles.sub}>{t('sub')}</span>
      </div>
      {rows.map((s, i) => (
        <div key={s.id} className={styles.row}>
          <span className={styles.n}>{i + 1}</span>
          <Cell value={s.name} placeholder={t('name')} onSave={save(s, 'name')} />
          <Cell value={s.model} placeholder={t('model')} onSave={save(s, 'model')} />
          <Cell value={s.description} placeholder={t('desc')} onSave={save(s, 'description')} />
          <button
            type="button"
            role="switch"
            aria-checked={s.enabled}
            title={t('visible')}
            className={styles.toggle}
            onClick={() => act.patch(s.id, { enabled: !s.enabled })}
          >
            <span className={`${styles.sw} ${s.enabled ? styles.swOn : ''}`}>
              <span className={styles.knob} />
            </span>
            {t('used', { n: s.requestCount })}
          </button>
          <button
            type="button"
            title={t('delete')}
            aria-label={t('delete')}
            className={styles.del}
            onClick={() => del(s)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.add} onClick={act.add}>
        {t('add')}
      </button>
    </div>
  );
}
