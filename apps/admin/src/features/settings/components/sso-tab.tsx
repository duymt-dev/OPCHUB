'use client';

import { ssoProviders } from '@opchub/shared/fixtures';
import { PASSWORD_LENGTHS, SESSION_DAYS } from '@opchub/shared/api-domains';
import { SsoIcon, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useSecurity } from '../hooks/use-security';
import { OptionRow, Switch } from './switch';
import styles from './sso.module.css';
import ui from './settings.module.css';

const nf = new Intl.NumberFormat('vi-VN');
const nameOf = (id: string) => ssoProviders.find((p) => p.id === id)?.name ?? id;

type Sec = ReturnType<typeof useSecurity>;

/** "Chính sách mật khẩu & bảo mật": độ dài, hạn phiên, 2FA quản trị viên, khoá 5 lần sai (D-44) */
function PolicyCard({ data, patch }: { data: NonNullable<Sec['data']>; patch: Sec['patch'] }) {
  const t = useTranslations('settings.sso');
  return (
    <section className={ui.card}>
      <div className={ui.h18}>{t('policy')}</div>
      <div className={ui.grid220}>
        <label className={ui.field}>
          {t('minLength')}
          <select
            className={ui.input42}
            value={data.minPasswordLength}
            onChange={(e) => {
              const n = PASSWORD_LENGTHS.find((x) => String(x) === e.target.value);
              if (n) patch({ minPasswordLength: n }, t('saved'));
            }}
          >
            {PASSWORD_LENGTHS.map((n) => (
              <option key={n} value={n}>
                {t('chars', { n })}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          {t('session')}
          <select
            className={ui.input42}
            value={data.sessionDays}
            onChange={(e) => {
              const n = SESSION_DAYS.find((x) => String(x) === e.target.value);
              if (n) patch({ sessionDays: n }, t('saved'));
            }}
          >
            {SESSION_DAYS.map((n) => (
              <option key={n} value={n}>
                {t('days', { n })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <OptionRow
        label={t('tfa')}
        desc={t('tfaDesc')}
        on={data.requireAdmin2fa}
        onChange={(v) => patch({ requireAdmin2fa: v }, t('saved'))}
      />
      <OptionRow
        label={t('lockout')}
        desc={t('lockoutDesc')}
        on={data.lockoutEnabled}
        onChange={(v) => patch({ lockoutEnabled: v }, t('saved'))}
      />
    </section>
  );
}

/**
 * D-76 (unreachable trên prototype, dựng theo D-33): nhà cung cấp SSO + "Chính sách mật khẩu
 * & bảo mật" (độ dài tối thiểu, hạn phiên, 2FA quản trị viên, khoá sau 5 lần sai — D-44).
 */
export function SsoTab() {
  const t = useTranslations('settings.sso');
  const toast = useToast();
  const { data, patch } = useSecurity();
  if (!data) return null;
  const onCount = data.providers.filter((p) => p.enabled).length;

  return (
    <>
      <section className={ui.card}>
        <div className={ui.headRow}>
          <div className={ui.head}>
            <div className={ui.h18}>{t('heading')}</div>
            <div className={ui.muted}>{t('headingSub')}</div>
          </div>
          <span className={styles.count}>{t('onCount', { n: onCount })}</span>
        </div>
        <div className={styles.grid}>
          {data.providers.map((p) => {
            const name = nameOf(p.id);
            return (
              <div key={p.id} className={`${styles.card} ${p.enabled ? styles.on : ''}`}>
                <div className={styles.top}>
                  <span className={styles.icon}>
                    <SsoIcon id={p.id} />
                  </span>
                  <div className={styles.text}>
                    <span className={styles.name}>{name}</span>
                    <span className={p.enabled ? styles.active : styles.off}>
                      {p.enabled ? t('active') : t('off')}
                    </span>
                  </div>
                  <Switch
                    on={p.enabled}
                    label={t('toggle', { name })}
                    onChange={(v) =>
                      patch(
                        { provider: { id: p.id, enabled: v } },
                        t(v ? 'providerOn' : 'providerOff', { name }),
                      )
                    }
                  />
                </div>
                <div className={styles.bottom}>
                  <span>{t('users', { n: nf.format(p.userCount) })}</span>
                  <button
                    type="button"
                    className={styles.cfg}
                    onClick={() => toast(t('configToast', { name }))}
                  >
                    {t('config')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <PolicyCard data={data} patch={patch} />
    </>
  );
}
