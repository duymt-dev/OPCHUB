'use client';

import { Drawer as AntDrawer } from 'antd';
import type { ReactNode } from 'react';
import styles from './drawer.module.css';

/** Gắn CSS module vào các phần semantic của antd */
const SEMANTIC_CLASSES = {
  mask: styles.mask ?? '',
  section: styles.section ?? '',
  header: styles.header ?? '',
  title: styles.title ?? '',
  body: styles.body ?? '',
  footer: styles.footer ?? '',
  close: styles.close ?? '',
};
export type DrawerSize = 'default' | 'large';

/** Prototype: drawer hồ sơ 480px, drawer biểu mẫu dự án 620px */
const DRAWER_WIDTH: Record<DrawerSize, number> = { default: 480, large: 620 };

export interface DrawerProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Vùng bên phải tiêu đề (tag trạng thái, nút phụ) */
  extra?: ReactNode;
  footer?: ReactNode;
  size?: DrawerSize;
  closeLabel?: string;
  /** Mặc định true: bấm nền mờ để đóng như prototype */
  maskClosable?: boolean;
  destroyOnHidden?: boolean;
}

/** Drawer phải dùng chung: header 16/24, nút đóng bên trái, footer căn phải */
export function Drawer({
  open,
  title,
  onClose,
  children,
  extra,
  footer,
  size = 'default',
  closeLabel = 'Đóng',
  maskClosable = true,
  destroyOnHidden = true,
}: DrawerProps) {
  return (
    <AntDrawer
      open={open}
      title={title}
      extra={extra}
      footer={footer}
      placement="right"
      size={DRAWER_WIDTH[size]}
      onClose={onClose}
      mask={{ closable: maskClosable }}
      destroyOnHidden={destroyOnHidden}
      closable={{ 'aria-label': closeLabel }}
      classNames={SEMANTIC_CLASSES}
    >
      {children}
    </AntDrawer>
  );
}
