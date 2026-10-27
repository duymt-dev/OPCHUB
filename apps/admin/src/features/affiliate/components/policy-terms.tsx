'use client';

import { Modal } from '@opchub/ui';
import { Button, Form, Input } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import styles from './policy-terms.module.css';

/**
 * SRS §20.6 "Điều khoản chương trình" — D-91 (2): prototype v4 không có ô này, nên thu thành nút
 * mở hộp thoại. Ô vẫn thuộc form chính (forceRender) → "Lưu chính sách" gửi kèm và lỗi 400 của
 * server vẫn gắn đúng ô; có lỗi thì hộp thoại tự mở để người dùng sửa.
 */
export function PolicyTerms() {
  return (
    <Form.Item noStyle shouldUpdate>
      {({ getFieldError }) => <TermsDialog invalid={getFieldError('terms').length > 0} />}
    </Form.Item>
  );
}

function TermsDialog({ invalid }: { invalid: boolean }) {
  const t = useTranslations('affiliate.policy');
  const [open, setOpen] = useState(false);
  const show = open || invalid;
  return (
    <>
      <Button className={styles.open ?? ''} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t('termsEdit')}
      </Button>
      <Modal
        open={show}
        title={t('terms')}
        onClose={() => setOpen(false)}
        size="medium"
        destroyOnHidden={false}
        forceRender
        footer={
          <Button type="primary" onClick={() => setOpen(false)}>
            {t('termsDone')}
          </Button>
        }
      >
        <Form.Item name="terms" label={t('terms')} rules={[{ max: 5000 }]}>
          <Input.TextArea rows={8} maxLength={5000} aria-label={t('terms')} />
        </Form.Item>
        <p className={styles.hint}>{t('termsHint')}</p>
      </Modal>
    </>
  );
}
