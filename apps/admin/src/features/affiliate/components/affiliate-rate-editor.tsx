'use client';

import { Button, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import { useAffiliateRateEditor } from '../hooks/use-affiliate-rate-editor';
import type { AffiliateRateEditorProps } from '../types';
import layout from './affiliate-detail.module.css';
import styles from './affiliate-rate-editor.module.css';
import { useNumberText } from '@/i18n/use-number-text';

/** Single-agent edits stay in the rate panel; bulk edits retain their separate dialog. */
export function AffiliateRateEditor({ id, rate }: AffiliateRateEditorProps) {
  const numberText = useNumberText();
  const t = useTranslations('affiliate');
  const editor = useAffiliateRateEditor({ id, rate });
  if (!editor.editing)
    return (
      <>
        <b className={layout.rateValue}>{numberText(rate)}%</b>
        <Button type="link" onClick={editor.open}>
          {t('editRate')}
        </Button>
      </>
    );
  return (
    <form
      className={styles.form}
      aria-label={t('rateTitle')}
      onSubmit={(event) => {
        event.preventDefault();
        editor.save();
      }}
    >
      <InputNumber
        className={styles.input ?? ''}
        aria-label={t('rateLabel')}
        value={editor.draft}
        onChange={editor.setDraft}
        controls={false}
        min={1}
        max={50}
        precision={0}
        disabled={editor.pending}
      />
      <span>%</span>
      <Button className={styles.cancel ?? ''} disabled={editor.pending} onClick={editor.cancel}>
        {t('cancel')}
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        disabled={!editor.valid || editor.pending}
        loading={editor.pending}
        title={t('rateChangeHint')}
      >
        {t('save')}
      </Button>
      {!editor.valid ? (
        <span className={styles.error} role="alert">
          {t('rateError')}
        </span>
      ) : null}
    </form>
  );
}
