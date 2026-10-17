'use client';

import { useTranslations } from 'next-intl';
import { useSmtp } from '../hooks/use-smtp';
import { EncSegment, Field, SmtpInput, type SmtpTextKey } from './smtp-fields';
import { Switch } from './switch';
import styles from './smtp.module.css';
import ui from './settings.module.css';

type Smtp = ReturnType<typeof useSmtp>;
type Form = NonNullable<Smtp['form']>;
/** Đổi người gửi / email thử không làm mất kết quả kiểm tra kết nối */
const KEEP_CHECK: readonly SmtpTextKey[] = [
  'test',
  'fromName',
  'fromEmail',
  'replyTo',
  'dailyLimit',
];

function ServerCard({ s, f }: { s: Smtp; f: Form }) {
  const t = useTranslations('settings.smtp');
  const onSet = (k: SmtpTextKey, v: string) => s.set({ [k]: v }, KEEP_CHECK.includes(k));
  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div className={styles.logo} aria-hidden>
          B
        </div>
        <div className={styles.title}>
          <span className={ui.h16}>{t('heading')}</span>
          <span className={styles.sub}>{t('headingSub')}</span>
        </div>
        <div className={styles.status}>
          <span className={styles.statusText}>
            <i className={`${styles.dot} ${styles[s.check]}`} />
            {t(`status.${s.check}`)}
          </span>
          <Switch
            on={f.enabled}
            size="md"
            label={t('switch')}
            title={t('switch')}
            onChange={(v) => s.set({ enabled: v }, true)}
          />
        </div>
      </div>
      <div className={styles.grid21}>
        <Field label={t('host')} req>
          <SmtpInput form={f} k="host" onSet={onSet} />
        </Field>
        <Field label={t('port')} req>
          <SmtpInput form={f} k="port" onSet={onSet} />
        </Field>
      </div>
      <EncSegment value={f.encryption} onChange={s.setEnc} />
      <div className={styles.grid11}>
        <Field label={t('user')} req>
          <SmtpInput form={f} k="username" onSet={onSet} placeholder={t('userPh')} />
        </Field>
        <Field label={t('key')} req>
          <div className={styles.keyRow}>
            <SmtpInput
              form={f}
              k="key"
              onSet={onSet}
              mono
              type={s.showKey ? 'text' : 'password'}
              placeholder={s.hasKey ? t('keySaved') : t('keyPh')}
            />
            <button type="button" className={styles.keyBtn} onClick={s.toggleKey}>
              {s.showKey ? t('hide') : t('show')}
            </button>
          </div>
        </Field>
      </div>
      <div className={styles.checkRow}>
        <button type="button" className={styles.check} onClick={s.verify}>
          {t('check')}
        </button>
        {s.check === 'err' ? <span className={styles.err}>{t('checkErr')}</span> : null}
        {s.check === 'ok' ? (
          <span className={styles.ok}>{t('checkOk', { host: f.host, port: f.port })}</span>
        ) : null}
      </div>
    </section>
  );
}

/** D-71 / D-72 "Gửi email (SMTP)" — Brevo: kết nối, người gửi, gửi thử, lưu */
export function SmtpTab() {
  const t = useTranslations('settings.smtp');
  const s = useSmtp();
  const f = s.form;
  if (!f) return null;
  const onSet = (k: SmtpTextKey, v: string) => s.set({ [k]: v }, KEEP_CHECK.includes(k));

  return (
    <div className={styles.stack}>
      <ServerCard s={s} f={f} />
      <section className={styles.card}>
        <span className={ui.h16}>{t('sender')}</span>
        <div className={styles.grid11}>
          <Field label={t('fromName')} req>
            <SmtpInput form={f} k="fromName" onSet={onSet} />
          </Field>
          <Field label={t('fromEmail')} req>
            <SmtpInput form={f} k="fromEmail" onSet={onSet} />
          </Field>
        </div>
        <div className={styles.grid11}>
          <Field label={t('replyTo')}>
            <SmtpInput form={f} k="replyTo" onSet={onSet} />
          </Field>
          <Field label={t('limit')}>
            <SmtpInput form={f} k="dailyLimit" onSet={onSet} />
          </Field>
        </div>
        <span className={ui.note}>{t('senderNote')}</span>
      </section>
      <section className={styles.card}>
        <span className={ui.h16}>{t('testTitle')}</span>
        <div className={styles.testRow}>
          <SmtpInput
            form={f}
            k="test"
            onSet={onSet}
            placeholder={t('testPh')}
            className={styles.testInput}
          />
          <button type="button" className={ui.btnDefault} onClick={s.sendTest}>
            {t('send')}
          </button>
        </div>
      </section>
      <div className={styles.foot}>
        <button type="button" className={ui.btnDefault} onClick={s.reset}>
          {t('reset')}
        </button>
        <button type="button" className={ui.btnPrimary} onClick={s.save}>
          {t('save')}
        </button>
      </div>
    </div>
  );
}
