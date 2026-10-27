'use client';

import { Modal as AntModal } from 'antd';
import type { ReactNode } from 'react';
import styles from './modal.module.css';

/** Gắn CSS module vào các phần semantic của antd */
const SEMANTIC_CLASSES = {
  mask: styles.mask ?? '',
  container: styles.container ?? '',
  header: styles.header ?? '',
  title: styles.title ?? '',
  body: styles.body ?? '',
  footer: styles.footer ?? '',
  close: styles.close ?? '',
};
export type ModalSize = 'small' | 'form' | 'default' | 'medium' | 'large';

/** Prototype: xác nhận 420px, form TK quản trị 540px, gán nhóm 560px, mẫu email 640px, thanh toán 720px */
const MODAL_WIDTH: Record<ModalSize, number> = {
  small: 420,
  form: 540,
  default: 560,
  medium: 640,
  large: 720,
};

export interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** null = không có footer */
  footer?: ReactNode;
  size?: ModalSize;
  closeLabel?: string;
  maskClosable?: boolean;
  /** Tắt nút đóng + ESC cho hộp thoại bắt buộc */
  dismissible?: boolean;
  destroyOnHidden?: boolean;
  /** Dựng nội dung ngay cả khi đóng (ô form trong hộp thoại vẫn đăng ký với Form) */
  forceRender?: boolean;
}

/** Hộp thoại giữa màn hình: header viền dưới, body 16/24, footer căn phải */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer = null,
  size = 'default',
  closeLabel = 'Đóng',
  maskClosable = true,
  dismissible = true,
  destroyOnHidden = true,
  forceRender = false,
}: ModalProps) {
  return (
    <AntModal
      open={open}
      title={title}
      onCancel={onClose}
      footer={footer}
      centered
      width={`min(${MODAL_WIDTH[size]}px, calc(100% - 24px))`}
      mask={{ closable: dismissible && maskClosable }}
      keyboard={dismissible}
      closable={dismissible ? { 'aria-label': closeLabel } : false}
      destroyOnHidden={destroyOnHidden}
      forceRender={forceRender}
      classNames={SEMANTIC_CLASSES}
    >
      {children}
    </AntModal>
  );
}
