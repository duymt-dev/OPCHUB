'use client';

import { Button, Modal } from 'antd';

export interface PaywallModalProps {
  open: boolean;
  title: string;
  description: string;
  amountLabel: string;
  payLabel: string;
  logoutLabel: string;
  onPay: () => void;
  onLogout: () => void;
}

/**
 * Chặn nội dung khi phí thành viên chưa thanh toán / hết hạn.
 * Không có nút đóng: chỉ thanh toán hoặc đăng xuất.
 */
export function PaywallModal(props: PaywallModalProps) {
  return (
    <Modal
      open={props.open}
      title={props.title}
      closable={false}
      mask={{ closable: false }}
      keyboard={false}
      centered
      footer={[
        <Button key="logout" onClick={props.onLogout}>
          {props.logoutLabel}
        </Button>,
        <Button key="pay" type="primary" onClick={props.onPay}>
          {props.payLabel}
        </Button>,
      ]}
    >
      <p style={{ margin: '0 0 12px', color: 'rgba(0,0,0,0.65)' }}>{props.description}</p>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#0B1F4D' }}>{props.amountLabel}</div>
    </Modal>
  );
}
