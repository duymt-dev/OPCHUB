'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './paywall-modal.module.css';

export interface PaywallModalLabels {
  close: string;
  /** Nhãn vàng khi bắt buộc, VD "Cần thanh toán để tiếp tục" */
  mustPay: string;
  logout: string;
}

export interface PaywallModalProps {
  open: boolean;
  /**
   * Bắt buộc (phí chưa thanh toán / hết hạn — BR-03, D-28): không có ×, có nhãn + "Đăng xuất";
   * bấm nền hoặc Esc gọi `onBlocked` thay vì đóng.
   */
  mandatory: boolean;
  /** Tên truy cập của hộp thoại */
  title: string;
  /** Rộng (gói + dịch vụ) hay 640px (form, phiếu đã gửi) */
  wide: boolean;
  /**
   * Bảng giá v4 (UP-12, prototype `_svFit`): rộng min(92vw, 1180px), cao tối đa 90vh, cuộn dọc;
   * < 1100px rộng 90vw; < 1024px toàn màn hình
   */
  fit?: boolean | undefined;
  labels: PaywallModalLabels;
  /** Góc trái đầu hộp (VD "‹ Gói dịch vụ") */
  back?: ReactNode;
  /** Đổi giá trị → cuộn hộp về đầu (đổi bước trong hộp) */
  scrollKey?: string;
  onClose: () => void;
  onLogout: () => void;
  onBlocked: () => void;
  children: ReactNode;
}

/**
 * Hộp Gói dịch vụ / chặn phí thành viên. Tự vẽ, không motion (đồng hồ parity dừng).
 * Khi bắt buộc vẫn dùng được nội dung bên trong (đăng ký tư vấn, thanh toán) — SRS §6.
 */
export function PaywallModal(props: PaywallModalProps) {
  const { open, mandatory, onClose, onBlocked, scrollKey } = props;
  const box = useRef<HTMLDivElement>(null);
  const dismiss = mandatory ? onBlocked : onClose;
  const fit = !!props.fit && props.wide && open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = 0;
  }, [scrollKey]);

  if (!open) return null;
  return (
    <>
      <div className={styles.mask} onClick={dismiss} aria-hidden="true" />
      <div
        ref={box}
        className={`${styles.dialog} ${props.wide ? styles.wide : styles.narrow} ${fit ? styles.fit : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
      >
        <div className={styles.head}>
          {props.back}
          <span className={styles.spacer} />
          {mandatory ? (
            <>
              <span className={styles.must}>{props.labels.mustPay}</span>
              <button type="button" className={styles.logout} onClick={props.onLogout}>
                {props.labels.logout}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.close}
              aria-label={props.labels.close}
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
        <div className={styles.body}>{props.children}</div>
      </div>
    </>
  );
}
