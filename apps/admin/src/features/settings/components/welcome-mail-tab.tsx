'use client';

import { useTranslations } from 'next-intl';
import { useWelcomeMail } from '../hooks/use-welcome-mail';
import { SwitchMark } from './switch';
import { AttachmentsEditor, RulesEditor } from './welcome-lists';
import { WelcomePreview } from './welcome-preview';
import styles from './welcome-mail.module.css';
import ui from './settings.module.css';

/** D-47: bỏ công tắc "Tài khoản & mật khẩu truy cập" */
const TOGGLES = ['showRules', 'showGuide'] as const;

/** D-70 "Email chào mừng" (D-30): mẫu + tài liệu đính kèm + quy định, xem trước trực tiếp */
export function WelcomeMailTab() {
  const t = useTranslations('settings.mail');
  const { mail, edit, save, test } = useWelcomeMail();
  if (!mail) return null;

  return (
    <>
      <div className={styles.intro}>
        <span className={ui.h16}>{t('heading')}</span>
        <span className={styles.introSub}>{t('headingSub')}</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <b>{t('heading')}</b>
              <span className={ui.muted}>{t('cardSub')}</span>
            </div>
            <span className={styles.badge}>{t('on')}</span>
          </div>
          <label className={styles.label}>
            {t('subject')}
            <input
              className={styles.input}
              value={mail.subject}
              onChange={(e) => edit({ subject: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            {t('intro')}
            <textarea
              className={styles.area}
              rows={3}
              value={mail.intro}
              onChange={(e) => edit({ intro: e.target.value })}
            />
          </label>
          <div className={styles.group}>
            {t('include')}
            {TOGGLES.map((k) => (
              <button
                key={k}
                type="button"
                role="switch"
                aria-checked={mail[k]}
                className={styles.toggle}
                onClick={() => edit({ [k]: !mail[k] })}
              >
                <SwitchMark on={mail[k]} size="sm" />
                {t(k)}
              </button>
            ))}
          </div>
          <AttachmentsEditor mail={mail} edit={edit} />
          <RulesEditor mail={mail} edit={edit} />
          <div className={styles.btns}>
            <button type="button" className={`${ui.btnDefault} ${styles.testBtn}`} onClick={test}>
              {t('test')}
            </button>
            <button type="button" className={ui.btnPrimary} onClick={save}>
              {t('save')}
            </button>
          </div>
        </div>
        <WelcomePreview mail={mail} />
      </div>
    </>
  );
}
