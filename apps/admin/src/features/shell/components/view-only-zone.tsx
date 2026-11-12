'use client';

import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import type { MouseEvent, ReactNode } from 'react';
import { isWriteClick, type RoTarget } from '../model-ro';
import styles from './rbac.module.css';

function pathOf(target: EventTarget, root: HTMLElement): RoTarget[] {
  const out: RoTarget[] = [];
  let el = target instanceof Element ? target : null;
  while (el && el !== root) {
    out.push({
      tag: el.tagName,
      text: el.textContent ?? '',
      title: el.getAttribute('title') ?? el.getAttribute('aria-label') ?? '',
      roOk: el.hasAttribute('data-ro-ok'),
      act: el.matches('[data-act],select,input[type=checkbox]'),
      pointer: getComputedStyle(el).cursor === 'pointer',
    });
    el = el.parentElement;
  }
  return out;
}

/**
 * RB-R07: vùng nội dung chế độ chỉ xem — dải xám đầu trang + chặn click nút ghi (capture) và toast
 * đúng câu prototype. Tìm/lọc/phân trang/xem chi tiết vẫn dùng được.
 */
export function ViewOnlyZone({
  readOnly,
  role,
  banner,
  showNotice = true,
  children,
}: {
  readOnly: boolean;
  role: string;
  /** Dải xem thử: prototype đặt sau dải chỉ xem, trước nội dung */
  banner?: ReactNode;
  /** A domain may supply its own preview notice; other menus retain the generic notice. */
  showNotice?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('common.rbac');
  const toast = useToast();
  if (!readOnly)
    return (
      <>
        {banner}
        {children}
      </>
    );
  const guard = (e: MouseEvent<HTMLDivElement>) => {
    if (!isWriteClick(pathOf(e.target, e.currentTarget))) return;
    e.stopPropagation();
    e.preventDefault();
    toast(t('viewOnlyToast', { role }));
  };
  return (
    <div className={styles.zone} onClickCapture={guard} data-view-only="1">
      {showNotice && (
        <div className={styles.viewOnly} role="status">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
          <span>{t.rich('viewOnly', { role, b: (c) => <b>{c}</b> })}</span>
        </div>
      )}
      {banner}
      {children}
    </div>
  );
}
