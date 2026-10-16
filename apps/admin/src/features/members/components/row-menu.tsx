'use client';

import type { AdminMember } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEscape } from '../hooks/use-escape';
import type { MemberHandlers } from '../types';
import { cellStyles, DotsIcon } from './cells';
import styles from './row-menu.module.css';

const MENU_W = 200;
const MENU_H = 190;

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

/** Vị trí như prototype: căn phải theo nút ⋯, lật lên khi gần đáy màn */
function placeOf(btn: HTMLElement): Pos {
  const r = btn.getBoundingClientRect();
  const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
  return r.bottom + MENU_H > window.innerHeight
    ? { left, bottom: window.innerHeight - r.top + 4 }
    : { left, top: r.bottom + 4 };
}

interface Props {
  m: AdminMember;
  h: MemberHandlers;
  canEdit: boolean;
}

/** Menu ⋯ "Đổi trạng thái" (D-13): Hoạt động / Khóa ↔ Mở khóa / Gán vào nhóm… / Xem hồ sơ */
export function RowMenu({ m, h, canEdit }: Props) {
  const t = useTranslations('members');
  const [pos, setPos] = useState<Pos | null>(null);
  const close = () => setPos(null);

  useEscape(pos !== null, close);

  const locked = m.status === 'locked';
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <div className={styles.wrap}>
      {/* Bọc div: kịch bản parity tìm nút ⋯ theo cấu trúc dòng của prototype */}
      <div className={styles.btn}>
        <button
          type="button"
          aria-label={t('col.actions', { name: m.fullName })}
          aria-haspopup="menu"
          aria-expanded={pos !== null}
          className={`${cellStyles.dots} ${pos ? cellStyles.dotsOn : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setPos(pos ? null : placeOf(e.currentTarget));
          }}
        >
          <DotsIcon />
        </button>
      </div>
      {pos ? (
        <>
          <button
            type="button"
            aria-label={t('assign.close')}
            className={styles.scrim}
            onClick={close}
          />
          <div role="menu" className={styles.menu} style={pos}>
            <div className={styles.head}>{t('menu.title')}</div>
            {canEdit ? (
              <>
                <MenuItem
                  dot="#52C41A"
                  label={t('menu.active')}
                  checked={!locked}
                  onClick={run(() => h.setStatus(m, 'active'))}
                />
                <MenuItem
                  dot={locked ? '#1677FF' : '#FF4D4F'}
                  tone={locked ? 'blue' : 'red'}
                  label={locked ? t('menu.unlock') : t('menu.lock')}
                  onClick={run(() => h.setStatus(m, locked ? 'active' : 'locked'))}
                />
                <MenuItem
                  dot="#722ED1"
                  label={t('menu.assign')}
                  onClick={run(() => h.assign([m.id]))}
                />
              </>
            ) : null}
            <div className={styles.sep} />
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={run(() => h.open(m))}
            >
              {t('menu.profile')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MenuItem(p: {
  dot: string;
  label: string;
  checked?: boolean;
  tone?: 'red' | 'blue';
  onClick: () => void;
}) {
  const tone = p.tone === 'red' ? styles.red : p.tone === 'blue' ? styles.blue : '';
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={p.checked ?? false}
      className={`${styles.item} ${styles.opt} ${tone} ${p.checked ? styles.cur : ''}`}
      onClick={p.onClick}
    >
      {/* Màu chấm theo trạng thái (dữ liệu menu), không phải token giao diện */}
      <i className={styles.dot} style={{ background: p.dot }} aria-hidden />
      <span className={styles.label}>{p.label}</span>
      <span className={styles.mark}>{p.checked ? '✓' : ''}</span>
    </button>
  );
}
