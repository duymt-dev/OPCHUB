'use client';

import { FieldErrorOf, type FieldErrorProps, invalidProps } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { money, repoUrlWarn, type SubmitField } from '../model';
import type { FormSet, ProjectFormState } from '../types';
import { RepoIcon } from './detail-side';
import base from './form.module.css';
import styles from './form-repo-fund.module.css';

interface Props {
  f: ProjectFormState;
  set: FormSet;
  /** Lỗi tại ô (BUG-022) */
  err: (k: SubmitField) => FieldErrorProps | undefined;
}

const REPO_PH = {
  github: 'https://github.com/ten-ban/ten-du-an',
  gitlab: 'https://gitlab.com/ten-ban/ten-du-an',
} as const;

/** Hai ô chọn kiểu radio-thẻ (quyền repo, quyền hiển thị) */
export function CardRadio({
  options,
  value,
  onChange,
  tight,
}: {
  options: { key: 'public' | 'private'; label: string; sub: string }[];
  value: 'public' | 'private';
  onChange: (v: 'public' | 'private') => void;
  tight?: boolean;
}) {
  return (
    <div className={styles.cardRadios} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          className={`${styles.cardRadio} ${tight ? styles.cardRadioTight : ''} ${value === o.key ? styles.cardRadioOn : ''}`}
          onClick={() => onChange(o.key)}
        >
          <i className={styles.radioDot}>
            <i />
          </i>
          <span className={styles.radioText}>
            <span className={styles.radioLabel}>{o.label}</span>
            <span className={styles.radioSub}>{o.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Link repo + quyền truy cập (khi đã chọn GitHub/GitLab) */
function RepoDetail({ f, set, err }: Props) {
  const t = useTranslations('projects.form');
  if (!f.repoProvider) return null;
  return (
    <>
      <label className={base.field}>
        {t('repoUrl')}
        <input
          className={base.input}
          value={f.repoUrl}
          placeholder={REPO_PH[f.repoProvider]}
          {...invalidProps(err('repoUrl'))}
          onChange={(e) => set('repoUrl', e.target.value)}
        />
        <FieldErrorOf e={err('repoUrl')} />
        {repoUrlWarn(f) ? (
          <span className={styles.warn}>{t('repoWarn', { ph: REPO_PH[f.repoProvider] })}</span>
        ) : null}
      </label>
      <div className={base.field}>
        {t('repoAccess')}
        <CardRadio
          tight
          value={f.repoVisibility}
          onChange={(v) => set('repoVisibility', v)}
          options={[
            { key: 'public', label: 'Public', sub: t('repoPublicSub') },
            { key: 'private', label: 'Private', sub: t('repoPrivateSub') },
          ]}
        />
      </div>
    </>
  );
}

/** "Bản test & mã nguồn": link test (bắt buộc khi gửi), GitHub/GitLab, Public/Private */
export function RepoSection({ f, set, err }: Props) {
  const t = useTranslations('projects.form');
  const provs = [
    { key: '' as const, label: t('repoNone') },
    { key: 'github' as const, label: 'GitHub' },
    { key: 'gitlab' as const, label: 'GitLab' },
  ];
  return (
    <div className={styles.boxGray}>
      <div className={styles.boxHead}>
        <span className={styles.boxTitle}>{t('repoBox')}</span>
        <span className={base.hint}>{t('repoBoxSub')}</span>
      </div>
      <label className={base.field}>
        <span>
          <span className={base.req}>*</span> {t('testUrl')}
        </span>
        <input
          className={base.input}
          value={f.testUrl}
          placeholder={t('testUrlPh')}
          {...invalidProps(err('testUrl'))}
          onChange={(e) => set('testUrl', e.target.value)}
        />
        <FieldErrorOf e={err('testUrl')} />
      </label>
      <div className={base.field}>
        {t('repo')}
        <div className={styles.seg} role="radiogroup">
          {provs.map((p) => (
            <button
              key={p.key || 'none'}
              type="button"
              role="radio"
              aria-checked={f.repoProvider === p.key}
              className={`${styles.segItem} ${f.repoProvider === p.key ? styles.segOn : ''}`}
              onClick={() => set('repoProvider', p.key)}
            >
              {p.key ? (
                <RepoIcon
                  provider={p.key}
                  size={14}
                  {...(f.repoProvider === p.key && p.key === 'github' ? { color: '#fff' } : {})}
                />
              ) : null}
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {f.repoProvider ? <RepoDetail f={f} set={set} err={err} /> : null}
    </div>
  );
}

/** Số vốn cần gọi (VND/USD) + % cổ phần chào bán */
function FundAmount({ f, set, err }: Props) {
  const t = useTranslations('projects.form');
  const amt = Number(f.fundAmount);
  return (
    <div className={styles.fundGrid}>
      <label className={base.field}>
        <span>
          <span className={base.req}>*</span> {t('fundAmount')}
        </span>
        <span className={styles.joined} data-invalid-frame="">
          <input
            type="number"
            min={0}
            className={styles.joinedInput}
            value={f.fundAmount}
            {...invalidProps(err('fundAmount'))}
            placeholder="2000000000"
            onChange={(e) => set('fundAmount', e.target.value)}
          />
          <select
            className={styles.joinedSelect}
            value={f.fundCurrency}
            aria-label={t('fundCurrency')}
            onChange={(e) => set('fundCurrency', e.target.value === 'USD' ? 'USD' : 'VND')}
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </span>
        <FieldErrorOf e={err('fundAmount')} />
        <span className={base.amountText}>{amt > 0 ? `= ${money(amt, f.fundCurrency)}` : ''}</span>
      </label>
      <label className={base.field}>
        <span>
          <span className={base.req}>*</span> {t('fundEquity')}
        </span>
        <span className={styles.joined} data-invalid-frame="">
          <input
            type="number"
            min={0.1}
            max={100}
            step={0.1}
            className={styles.joinedInput}
            value={f.fundEquity}
            {...invalidProps(err('fundEquity'))}
            placeholder="10"
            onChange={(e) => set('fundEquity', e.target.value)}
          />
          <span className={styles.suffix}>%</span>
        </span>
        <FieldErrorOf e={err('fundEquity')} />
      </label>
    </div>
  );
}

/** "Dự án đang tìm kiếm đầu tư": công tắc + số vốn, tiền tệ, % cổ phần, tối thiểu, deck, mục đích */
export function FundSection({ f, set, err }: Props) {
  const t = useTranslations('projects.form');
  return (
    <div className={`${styles.boxFund} ${f.fundOn ? styles.boxFundOn : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={f.fundOn}
        className={styles.fundToggle}
        onClick={() => set('fundOn', !f.fundOn)}
      >
        <span className={styles.boxHead}>
          <span className={styles.boxTitle}>{t('fund')}</span>
          <span className={base.hint}>{t('fundSub')}</span>
        </span>
        <span className={`${styles.switch} ${f.fundOn ? styles.switchOn : ''}`}>
          <i />
        </span>
      </button>
      {f.fundOn ? (
        <>
          <FundAmount f={f} set={set} err={err} />
          <div className={base.two}>
            <label className={base.field}>
              {t('fundMin')}
              <input
                type="number"
                min={0}
                className={base.input}
                value={f.fundMin}
                placeholder={t('fundMinPh')}
                onChange={(e) => set('fundMin', e.target.value)}
              />
            </label>
            <label className={base.field}>
              {t('fundDeck')}
              <input
                className={base.input}
                value={f.fundDeck}
                placeholder={t('fundDeckPh')}
                onChange={(e) => set('fundDeck', e.target.value)}
              />
            </label>
          </div>
          <label className={base.field}>
            {t('fundUse')}
            <textarea
              rows={3}
              className={base.textarea}
              value={f.fundUse}
              placeholder={t('fundUsePh')}
              onChange={(e) => set('fundUse', e.target.value)}
            />
          </label>
          <span className={base.hint}>{t('fundNote')}</span>
        </>
      ) : null}
    </div>
  );
}
