'use client';

import { Modal } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import c from './cards.module.css';

interface Props {
  target: { title: string; body: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Xác nhận thao tác phá huỷ (xoá persona / kịch bản) — data-state.md, luật 10 */
export function ConfirmDelete({ target, onCancel, onConfirm }: Props) {
  const t = useTranslations('bots');
  return (
    <Modal
      open={!!target}
      size="small"
      title={target?.title ?? ''}
      closeLabel={t('close')}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={c.btn} onClick={onCancel}>
            {t('confirm.cancel')}
          </button>
          <button type="button" className={`${c.btnPrimary} ${c.btnDanger}`} onClick={onConfirm}>
            {t('confirm.ok')}
          </button>
        </>
      }
    >
      {target?.body}
    </Modal>
  );
}
