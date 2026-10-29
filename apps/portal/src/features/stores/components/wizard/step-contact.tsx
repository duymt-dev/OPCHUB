'use client';

import { STORE_LIMITS, STORE_SOCIAL_KEYS, type StoreUpsert } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { completeness } from '../../model';
import f from './fields.module.css';
import { Label } from './step-info';
import s from './steps.module.css';
import { SocialIcon } from './social-icon';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
}

type ListKey = 'phones' | 'emails' | 'addresses';
type MainKey = 'phone' | 'email' | 'address';

/** Ô chính + các ô phụ có × + "+ Thêm …" (prototype `xPhones` / `xEmails` / `xAddrs`) */
function Multi(p: Props & { main: MainKey; list: ListKey; req?: boolean; tel?: boolean }) {
  const t = useTranslations('stores.wizard');
  const { draft, set, main, list } = p;
  const items = draft[list];
  const patch = (ix: number, v: string) => set({ [list]: items.map((x, j) => (j === ix ? v : x)) });
  return (
    <div className={f.field}>
      <Label text={t(`${main}Label`)} req={p.req ?? false} />
      <input
        className={f.input}
        value={draft[main]}
        placeholder={t(`${main}Ph`)}
        {...(p.tel ? { inputMode: 'tel' as const } : {})}
        onChange={(e) => set({ [main]: e.target.value })}
      />
      {items.map((v, ix) => (
        <div key={ix} className={f.extra}>
          <input
            className={f.input}
            value={v}
            placeholder={t(`${main}MorePh`)}
            {...(p.tel ? { inputMode: 'tel' as const } : {})}
            onChange={(e) => patch(ix, e.target.value)}
          />
          <button
            type="button"
            className={f.rm}
            aria-label={t('remove')}
            onClick={() => set({ [list]: items.filter((_, j) => j !== ix) })}
          >
            ×
          </button>
        </div>
      ))}
      {items.length < STORE_LIMITS[list] ? (
        <button type="button" className={f.link} onClick={() => set({ [list]: [...items, ''] })}>
          {t(`${main}Add`)}
        </button>
      ) : null}
    </div>
  );
}

/** "Mức độ hoàn thiện" 5 mục (prototype `chk`) */
export function Completeness({ draft }: { draft: StoreUpsert }) {
  const t = useTranslations('stores.mine');
  const { checks, pct } = completeness(draft);
  return (
    <div className={s.pctBox}>
      <div className={s.pctRow}>
        <span>{t('completeness')}</span>
        <b>{pct}%</b>
      </div>
      <div className={s.bar}>
        <div className={s.barFill} style={{ width: `${pct}%` }} />
      </div>
      {checks.map(([k, ok]) => (
        <div key={k} className={s.check} data-ok={ok ? '1' : '0'}>
          <span className={s.dot}>{ok ? '✓' : ''}</span>
          {t(`check.${k}`)}
        </div>
      ))}
    </div>
  );
}

/** Bước 5 "Liên hệ & xuất bản" (prototype :2111 → 2131) */
export function StepContact({ draft, set }: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <>
      <span className={f.h}>{t('steps.5')}</span>
      <Multi draft={draft} set={set} main="phone" list="phones" req tel />
      <Multi draft={draft} set={set} main="email" list="emails" />
      <Multi draft={draft} set={set} main="address" list="addresses" req />
      <span className={f.section}>{t('socials')}</span>
      <div className={s.socials}>
        {STORE_SOCIAL_KEYS.map((k) => (
          <div key={k} className={s.social}>
            <SocialIcon k={k} size={40} square />
            <input
              className={s.socialInput}
              aria-label={t(`social.${k}`)}
              placeholder={t(`socialPh.${k}`)}
              value={k === 'web' ? draft.website : draft.socials[k]}
              onChange={(e) =>
                k === 'web'
                  ? set({ website: e.target.value })
                  : set({ socials: { ...draft.socials, [k]: e.target.value } })
              }
            />
          </div>
        ))}
      </div>
      <Completeness draft={draft} />
    </>
  );
}
