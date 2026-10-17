'use client';

import type { MailLogRow } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useEscape } from '../hooks/use-escape';
import { useWelcomeMail } from '../hooks/use-marketing';
import ov from './overlay.module.css';
import { WelcomePreview } from './welcome-preview';

/** Hộp "Xem" email trong Nhật ký gửi (wmOpen) — 640px, tự vẽ */
export function MailViewDialog({ row, onClose }: { row: MailLogRow | null; onClose: () => void }) {
  const t = useTranslations('marketing.mail');
  const tpl = useWelcomeMail(row !== null).data;
  useEscape(row !== null, onClose);
  if (!row) return null;
  return (
    <div className={ov.dialogMask}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={ov.backdrop}
        onClick={onClose}
      />
      <div className={ov.dialog} role="dialog" aria-modal="true" aria-labelledby="mk-wm-title">
        <div className={ov.dialogHead}>
          <span className={ov.check} aria-hidden="true">
            ✓
          </span>
          <div className={ov.dialogText}>
            <b id="mk-wm-title">{t(row.kind === 'welcome' ? 'sentWelcome' : 'sentCampaign')}</b>
            <span className={ov.dialogSub}>{t('to', { to: row.to, subject: row.subject })}</span>
          </div>
          <button type="button" className={ov.x} aria-label={t('close')} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={ov.dialogBody}>
          {tpl ? <WelcomePreview tpl={tpl} name={row.name} email={row.to} /> : null}
        </div>
      </div>
    </div>
  );
}
