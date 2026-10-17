'use client';

import type { AdminCategory } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useCategories } from '../hooks/use-categories';
import { useSettingsRoute } from '../hooks/use-settings-route';
import { filterCategories } from '../model';
import { CATEGORY_FILTERS, EMPTY_CATEGORY, type AskConfirm, type CategoryDraft } from '../types';
import { CategoryForm } from './category-form';
import { CategoryTable } from './category-table';
import styles from './categories.module.css';
import ui from './settings.module.css';

const draftOf = (c: AdminCategory): CategoryDraft => ({
  id: c.id,
  name: c.name,
  color: c.color,
  scope: [...c.scope],
});

/** D-67 / D-68 "Danh mục lĩnh vực": form thêm/sửa (`?edit=id`), lọc, bảng, ghi chú */
export function CategoriesTab({ ask }: { ask: AskConfirm }) {
  const t = useTranslations('settings.cat');
  const c = useTranslations('settings.common');
  const { params, update } = useSettingsRoute();
  const cat = useCategories();
  const rows = cat.rows;
  const editing = rows.find((x) => x.id === params.edit);
  const shown = filterCategories(rows, params.scope);
  const count = (f: (typeof CATEGORY_FILTERS)[number]) => filterCategories(rows, f).length;
  const on = rows.filter((x) => x.enabled).length;

  const del = (x: AdminCategory) => {
    if (cat.inUse(x)) return cat.warnInUse();
    ask({
      title: t('confirmTitle'),
      body: t('confirmBody', { name: x.name }),
      okLabel: t('delete'),
      cancelLabel: c('cancel'),
      danger: true,
      onOk: () => cat.remove(x),
    });
  };

  return (
    <section className={ui.card}>
      <div className={ui.head}>
        <div className={ui.h18}>{t('heading')}</div>
        <div className={ui.muted}>{t('headingSub')}</div>
      </div>
      <CategoryForm
        key={editing?.id ?? 'new'}
        initial={editing ? draftOf(editing) : EMPTY_CATEGORY}
        onSave={(d, done) => cat.save(d, () => (d.id ? update({ edit: '' }) : done()))}
        onCancel={() => update({ edit: '' })}
      />
      <div className={styles.filterRow}>
        <div className={styles.seg} role="radiogroup" aria-label={t('cols.scope')}>
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={params.scope === f}
              className={`${styles.segItem} ${params.scope === f ? styles.segOn : ''}`}
              onClick={() => update({ scope: f })}
            >
              {t(f)}
              <span className={styles.segN}>{count(f)}</span>
            </button>
          ))}
        </div>
        <span className={styles.info}>{t('info', { on, off: rows.length - on })}</span>
      </div>
      <CategoryTable
        rows={shown}
        editId={editing?.id ?? null}
        onMove={cat.move}
        onToggle={cat.toggle}
        onEdit={(x) => update({ edit: x.id })}
        onDelete={del}
        inUse={cat.inUse}
      />
      <span className={ui.note}>{t('note')}</span>
    </section>
  );
}
