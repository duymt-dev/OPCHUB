'use client';

import { STORE_ITEM_KINDS, STORE_ITEMS_MAX, type StoreItemInput } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { PickImage } from '../hooks/use-store-images';
import { emptyItem, formatPrice, parsePrice } from '../model';
import { ImagePick } from './image-pick';
import styles from './mine.module.css';
import base from './stores.module.css';

interface Editing {
  ix: number | null;
  item: StoreItemInput;
  price: string;
}

interface FormProps {
  e: Editing;
  set: (e: Editing) => void;
  pickItem: PickImage;
  onCancel: () => void;
  onSave: () => void;
}

/** Ô thêm / sửa 1 sản phẩm / dịch vụ (prototype `st.pf`) */
function ItemForm({ e, set, pickItem, onCancel, onSave }: FormProps) {
  const t = useTranslations('stores');
  const put = (patch: Partial<StoreItemInput>) => set({ ...e, item: { ...e.item, ...patch } });
  return (
    <div className={styles.itemForm}>
      <span className={styles.itemFormTitle}>
        {t(e.ix === null ? 'item.addTitle' : 'item.editTitle')}
      </span>
      <div className={styles.kindRow}>
        {STORE_ITEM_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={e.item.kind === k}
            className={`${styles.kindPick} ${e.item.kind === k ? styles.kindPickOn : ''}`}
            onClick={() => put({ kind: k })}
          >
            {t(`kindLabel.${k}`)}
          </button>
        ))}
      </div>
      <div className={styles.itemGrid}>
        <label className={styles.field}>
          {t('item.name')}
          <input
            className={styles.input}
            value={e.item.name}
            onChange={(ev) => put({ name: ev.target.value })}
          />
        </label>
        <label className={styles.field}>
          {t('item.price')}
          <input
            className={styles.input}
            inputMode="numeric"
            value={e.price}
            onChange={(ev) => set({ ...e, price: ev.target.value.replace(/\D/g, '') })}
          />
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('item.desc')}
          <input
            className={styles.input}
            value={e.item.description}
            onChange={(ev) => put({ description: ev.target.value })}
          />
        </label>
      </div>
      <div className={styles.field}>
        <span>{t('item.image')}</span>
        <ImagePick
          shape="square"
          value={e.item.imageUrl}
          label={t('item.imagePick')}
          pick={pickItem}
          onChange={(imageUrl) => put({ imageUrl })}
        />
      </div>
      <div className={styles.formBtns}>
        <button type="button" className={base.btn} onClick={onCancel}>
          {t('item.cancel')}
        </button>
        <button type="button" className={`${base.btn} ${base.btnPrimary}`} onClick={onSave}>
          {t('item.save')}
        </button>
      </div>
    </div>
  );
}

interface Props {
  items: StoreItemInput[];
  pickItem: PickImage;
  /** Lưu danh sách mới lên server kèm câu toast */
  commit: (items: StoreItemInput[], text: string) => void;
}

/** Khối "Sản phẩm & dịch vụ": thêm / sửa / xoá, mỗi thao tác lưu ngay như prototype `persist` */
export function MineItems({ items, pickItem, commit }: Props) {
  const t = useTranslations('stores');
  const toast = useToast();
  const [edit, setEdit] = useState<Editing | null>(null);
  const open = (ix: number | null) => {
    const item = ix === null ? emptyItem() : (items[ix] ?? emptyItem());
    setEdit({ ix, item, price: item.price ? String(item.price) : '' });
  };
  const save = () => {
    if (!edit) return;
    const name = edit.item.name.trim();
    if (!name) return toast(t('toast.needItemName'));
    const it = { ...edit.item, name, price: parsePrice(edit.price) };
    const next = edit.ix === null ? [...items, it] : items.map((x, j) => (j === edit.ix ? it : x));
    commit(next, t(edit.ix === null ? 'toast.added' : 'toast.updated', { name }));
    setEdit(null);
  };
  return (
    <section className={base.card}>
      <div className={base.cardHead}>
        <span className={base.cardTitle}>{t('mine.items')}</span>
        <button
          type="button"
          className={`${base.btn} ${base.btnPrimary}`}
          disabled={items.length >= STORE_ITEMS_MAX}
          onClick={() => open(null)}
        >
          {t('mine.addItem')}
        </button>
      </div>
      {edit ? (
        <ItemForm
          e={edit}
          set={setEdit}
          pickItem={pickItem}
          onCancel={() => setEdit(null)}
          onSave={save}
        />
      ) : null}
      {items.map((i, ix) => (
        <div key={`${ix}-${i.name}`} className={styles.itemRow}>
          <div
            className={styles.itemThumb}
            style={i.imageUrl ? { backgroundImage: `url('${i.imageUrl}')` } : undefined}
          />
          <div className={styles.itemText}>
            <div className={styles.itemHead}>
              <span className={styles.itemName}>{i.name}</span>
              <span className={base.kindTag} data-kind={i.kind}>
                {t(`kindLabel.${i.kind}`)}
              </span>
            </div>
            <span className={styles.itemDesc}>{i.description}</span>
          </div>
          <b className={styles.itemPrice}>{formatPrice(i.price) ?? t('detail.contactPrice')}</b>
          <button type="button" className={styles.linkBtn} onClick={() => open(ix)}>
            {t('mine.editItem')}
          </button>
          <button
            type="button"
            className={`${styles.linkBtn} ${styles.danger}`}
            onClick={() =>
              commit(
                items.filter((_, j) => j !== ix),
                t('toast.deleted', { name: i.name }),
              )
            }
          >
            {t('mine.delItem')}
          </button>
        </div>
      ))}
      {items.length === 0 ? <div className={styles.noItems}>{t('mine.noItems')}</div> : null}
    </section>
  );
}
