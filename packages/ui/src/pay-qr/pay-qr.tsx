'use client';

import { QRCode } from 'antd';
import { useState } from 'react';
import styles from './pay-qr.module.css';

const QrIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
  </svg>
);

/** Chân thẻ VietQR (mẫu compact2): tên tài khoản, số tài khoản, số tiền */
export interface PayQrCaption {
  accountName: string;
  accountNo: string;
  /** Dòng số tiền đã định dạng, vd "Số tiền: 15.000.000 VND" */
  amount: string;
}

/** Tên TK in hoa không dấu như ảnh mẫu VietQR (CONG TY CO PHAN …) */
export const qrCaption = (
  bank: { accountName: string; accountNo: string },
  amountLine: string,
): PayQrCaption => ({
  accountName: bank.accountName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase(),
  accountNo: bank.accountNo,
  amount: amountLine,
});

/** Số tiền kiểu VietQR "15.000.000" */
export const qrVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

interface Props {
  /** Chuỗi VietQR EMVCo do server sinh (D-96); trống → ảnh QR tĩnh của tài khoản */
  value: string;
  /** Cạnh khung QR (prototype: phí 220, Gọi vốn 200) */
  size: number;
  label: string;
  /** "Đang tải mã QR…" (i18n của app) */
  loadingText: string;
  caption: PayQrCaption;
}

/** Thẻ VietQR thiết kế ở 200 × 200 rồi phóng theo khung (như ảnh mẫu compact2) */
const BASE = 200;

/** Logo chữ V đỏ giữa mã như ảnh mẫu VietQR (mức sửa lỗi H, khoét 9 × 9 ô) */
const V_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><rect width="18" height="18" fill="#fff"/>' +
      '<path d="M3.6 4.4h3.4l3 8.6h-2.4z" fill="#a8292a"/><path d="M14.4 4.4h-3.6l-3.2 9.4h3z" fill="#e92232"/></svg>',
  );

/**
 * UI-PAY-02: khung QR kích thước cố định; chưa có mã → biểu tượng + "Đang tải mã QR…" (không hiện alt).
 * D-96: thẻ VietQR vẽ tại chỗ từ chuỗi EMVCo (không gọi dịch vụ ngoài) theo bố cục mẫu compact2 của
 * prototype; lỗi → ảnh QR tĩnh Vietcombank.
 */
export function PayQr({ value, size, label, loadingText, caption }: Props) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={styles.frame} style={{ width: size, height: size }} data-testid="pay-qr">
      <div className={styles.loading}>
        <QrIcon />
        {loadingText}
      </div>
      {value && !broken ? (
        <div className={styles.cover} role="img" aria-label={label}>
          <div className={styles.card} style={{ transform: `scale(${size / BASE})` }}>
            <span className={styles.brand} aria-hidden="true">
              <span className={styles.brandV}>V</span>IETQR
            </span>
            <div className={styles.box}>
              <QRCode
                value={value}
                type="svg"
                size={114}
                color="#111111"
                bordered={false}
                errorLevel="H"
                icon={V_ICON}
                iconSize={18}
                onRefresh={() => setBroken(true)}
              />
            </div>
            <div className={styles.partners} aria-hidden="true">
              <span className={styles.napas}>
                napas <span className={styles.napas247}>247</span>
              </span>
              <span className={styles.sep} />
              <span className={styles.bank}>Vietcombank</span>
            </div>
            <span className={styles.l1}>{caption.accountName}</span>
            <span className={styles.l2}>{caption.accountNo}</span>
            <span className={styles.l3}>{caption.amount}</span>
          </div>
        </div>
      ) : (
        <img className={styles.cover} src="/vcb-qr.png" alt="" />
      )}
    </div>
  );
}
