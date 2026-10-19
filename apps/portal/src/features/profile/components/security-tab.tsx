'use client';

import { SsoIcon } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useSecurity } from '../hooks/use-security';
import { strengthBars } from '../model';
import { Field, TextInput } from './form-fields';
import styles from './profile.module.css';
import sec from './security.module.css';

/** P-93 / P-94: đổi mật khẩu + thanh độ mạnh, tài khoản liên kết SSO, đăng xuất thiết bị khác */
export function SecurityTab({ linked, hasPassword }: { linked: string[]; hasPassword: boolean }) {
  const t = useTranslations('profile.security');
  const s = useSecurity(linked, hasPassword);
  const { score, bars } = strengthBars(s.pw.next);
  const levels = t.raw('levels') as string[];

  return (
    <>
      <div className={sec.password}>
        <span className={sec.title}>{t('title')}</span>
        <Field label={t('current')}>
          <TextInput type="password" value={s.pw.cur} onValue={(v) => s.setPw('cur', v)} />
        </Field>
        <Field label={t('next')}>
          <TextInput type="password" value={s.pw.next} onValue={(v) => s.setPw('next', v)} />
          <div className={sec.bars} aria-hidden="true">
            {bars.map((tone, i) => (
              <i key={i} data-tone={tone} />
            ))}
          </div>
          <span className={sec.hint}>{s.pw.next ? levels[score] : t('hint')}</span>
        </Field>
        <Field label={t('confirm')}>
          <TextInput type="password" value={s.pw.confirm} onValue={(v) => s.setPw('confirm', v)} />
        </Field>
        <div>
          <button type="button" className={styles.primary} disabled={s.busy} onClick={s.submit}>
            {t('submit')}
          </button>
        </div>
      </div>
      <div className={sec.block}>
        <span className={sec.title}>{t('linked')}</span>
        {s.lastLink ? <span className={sec.hint}>{t('lastSsoHint')}</span> : null}
        {s.providers.map((p) => (
          <div key={p.id} className={sec.sso}>
            <SsoIcon id={p.id} />
            <span className={sec.ssoName}>{p.name}</span>
            <span className={sec.ssoState} data-on={p.linked}>
              {p.linked ? t('linkedOn') : t('linkedOff')}
            </span>
            <button
              type="button"
              className={sec.ssoBtn}
              data-on={p.linked}
              disabled={p.locked}
              title={p.locked ? t('lastSsoHint') : undefined}
              onClick={() => s.toggleSso(p)}
            >
              {p.linked ? t('unlink') : t('link')}
            </button>
          </div>
        ))}
      </div>
      <div className={sec.logoutRow}>
        <div className={sec.logoutText}>
          <span className={sec.logoutTitle}>{t('logoutAll')}</span>
          <span className={sec.hint}>{t('logoutAllSub')}</span>
        </div>
        <button type="button" className={sec.logoutBtn} onClick={s.logoutOthers}>
          {t('logout')}
        </button>
      </div>
    </>
  );
}
