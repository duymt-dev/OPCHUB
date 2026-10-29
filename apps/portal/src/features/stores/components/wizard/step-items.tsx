'use client';

import { STORE_ITEMS_MAX, type StoreItemKind, type StoreUpsert } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { formatPrice, parsePrice } from '../../model';
import f from './fields.module.css';
import { Field } from './step-info';
import s from './steps.module.css';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
}

const KINDS: readonly StoreItemKind[] = ['product', 'service'];

/** Chip loại, Tên *, Giá (để trống = báo giá riêng), Mô tả ngắn, "+ Thêm vào danh mục" */
function ItemForm({ set }: Props) {
  const t = useTranslations('stores');
  const w = useTranslations('stores.wizard');
  const toast = useToast();
  const [kind, setKind] = useState<StoreItemKind>('product');
  const [v, setV] = useState({ name: '', price: '', desc: '' });
  const add = () => {
    if (!v.name.trim()) return toast(w('needItemName'));
    const item = {
      kind,
      name: v.name.trim(),
      price: parsePrice(v.price),
      description: v.desc.trim(),
      imageUrl: null,
    };
    set((d) => ({ items: [...d.items, item].slice(0, STORE_ITEMS_MAX) }));
    setV({ name: '', price: '', desc: '' });
  };
  return (
    <div className={f.box}>
      <div className={f.chips}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={`${f.chip} ${f.chipSm}`}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {t(`kindLabel.${k}`)}
          </button>
        ))}
      </div>
      <div className={f.grid2}>
        <Field label={w('itemName')} req>
          <input
            className={f.input}
            value={v.name}
            placeholder={w('itemNamePh')}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
        <Field label={w('itemPrice')}>
          <input
            className={f.input}
            value={v.price}
            inputMode="numeric"
            placeholder={w('itemPricePh')}
            onChange={(e) => setV({ ...v, price: e.target.value })}
          />
        </Field>
      </div>
      <Field label={w('itemDesc')}>
        <input
          className={f.input}
          value={v.desc}
          placeholder={w('itemDescPh')}
          onChange={(e) => setV({ ...v, desc: e.target.value })}
        />
      </Field>
      <button type="button" className={f.dashed} onClick={add}>
        {w('addItem')}
      </button>
    </div>
  );
}

/** Danh sách mục: nhãn loại · tên · mô tả · giá · Xóa */
function ItemList({ draft, set }: Props) {
  const t = useTranslations('stores');
  const w = useTranslations('stores.wizard');
  return (
    <>
      {draft.items.length === 0 ? <span className={s.none}>{w('noItems')}</span> : null}
      <div className={s.items}>
        {draft.items.map((i, ix) => (
          <div key={`${i.name}-${ix}`} className={s.item}>
            <span className={s.kind} data-kind={i.kind}>
              {t(`kindLabel.${i.kind}`)}
            </span>
            <div className={s.itemText}>
              <span className={s.itemName}>{i.name}</span>
              <span className={s.itemDesc}>{i.description}</span>
            </div>
            <span className={s.itemPrice}>{formatPrice(i.price) ?? w('contactPrice')}</span>
            <button
              type="button"
              className={f.del}
              onClick={() => set((d) => ({ items: d.items.filter((_, j) => j !== ix) }))}
            >
              {w('delete')}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Bước 4 "Sản phẩm & dịch vụ" (prototype :2089 → 2109) */
export function StepItems(props: Props) {
  const w = useTranslations('stores.wizard');
  return (
    <>
      <div className={s.itemsHead}>
        <span className={f.h}>{w('steps.4')}</span>
        <span className={s.muted}>{w('itemsCount', { n: props.draft.items.length })}</span>
      </div>
      <ItemForm {...props} />
      <ItemList {...props} />
    </>
  );
}
