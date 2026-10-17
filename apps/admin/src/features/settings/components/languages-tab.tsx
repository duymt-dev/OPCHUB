'use client';

import { languages } from '@opchub/shared/fixtures';
import { useTranslations } from 'next-intl';
import { useLanguages } from '../hooks/use-security';
import { SwitchMark } from './switch';
import styles from './sso.module.css';
import ui from './settings.module.css';

const meta = new Map(languages.map((l) => [l.code, l]));
const nativeOf = (code: string) => meta.get(code)?.native ?? code;

/** D-77 (unreachable trên prototype, dựng theo D-33): ngôn ngữ mặc định + bật/tắt, % bản dịch */
export function LanguagesTab() {
  const t = useTranslations('settings.lang');
  const { data, patch, toast } = useLanguages();
  if (!data) return null;

  return (
    <section className={ui.card}>
      <div className={ui.headRow}>
        <div className={ui.head}>
          <div className={ui.h18}>{t('heading')}</div>
          <div className={ui.muted}>{t('headingSub')}</div>
        </div>
        <label className={styles.defLabel}>
          {t('default')}
          <select
            className={styles.defSelect}
            value={data.defaultLocale}
            onChange={(e) =>
              patch(
                { defaultLocale: e.target.value },
                t('defaultSet', { name: nativeOf(e.target.value) }),
              )
            }
          >
            {data.items.map((l) => (
              <option key={l.code} value={l.code}>
                {nativeOf(l.code)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.langGrid}>
        {data.items.map((l) => {
          const m = meta.get(l.code);
          const name = nativeOf(l.code);
          const tone = l.progress === 100 ? styles.full : l.progress > 80 ? styles.good : '';
          return (
            <button
              key={l.code}
              type="button"
              role="switch"
              aria-checked={l.enabled}
              aria-label={t('toggle', { name: `${name} (${m?.country ?? l.code})` })}
              className={styles.lang}
              onClick={() => {
                if (l.enabled && l.code === data.defaultLocale) return toast(t('cantOff'));
                patch(
                  { toggle: { code: l.code, enabled: !l.enabled } },
                  t(l.enabled ? 'off' : 'on', { name }),
                );
              }}
            >
              <span className={styles.cc}>{m?.cc ?? ''}</span>
              <span className={styles.langText}>
                <span className={styles.langName}>
                  <span className={styles.native}>{name}</span>
                  <span className={styles.country}>{m?.country ?? ''}</span>
                </span>
                <span className={styles.bar}>
                  <span className={styles.track}>
                    <span
                      className={`${styles.fill} ${tone}`}
                      style={{ ['--p' as string]: `${l.progress}%` }}
                    />
                  </span>
                  {l.progress}%
                </span>
              </span>
              <SwitchMark on={l.enabled} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
