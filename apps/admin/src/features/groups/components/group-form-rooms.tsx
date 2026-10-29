'use client';

import { DEFAULT_ROOM_KEYS } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { GroupFormState } from '../types';
import type { FormPatch } from './group-form-fields';
import styles from './group-form.module.css';

interface Props {
  f: GroupFormState;
  set: FormPatch;
}

function RoomsHead({ count, manage }: { count: number; manage?: ReactNode }) {
  const t = useTranslations('groups.form');
  return (
    <div className={styles.split}>
      <span>
        {t('rooms')} <span className={styles.hint}>{t('roomsHint')}</span>
      </span>
      <div className={styles.splitEnd}>
        {manage}
        <span className={styles.hint}>{t('roomCount', { count })}</span>
      </div>
    </div>
  );
}

/** Phòng chat mặc định (# Chung luôn bật) + phòng tự đặt tên; `manage` = nút "Quản lý chủ đề" khi sửa (D-111) */
export function RoomFields({ f, set, manage }: Props & { manage?: ReactNode }) {
  const t = useTranslations('groups.form');
  const count = f.rooms.length + f.extraRooms.filter((x) => x.name.trim()).length;
  const toggle = (k: (typeof DEFAULT_ROOM_KEYS)[number], on: boolean) =>
    set({ rooms: on ? f.rooms.filter((x) => x !== k) : [...f.rooms, k] });
  const patchExtra = (i: number, p: Partial<{ name: string; description: string }>) =>
    set({ extraRooms: f.extraRooms.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className={styles.field}>
      <RoomsHead count={count} manage={manage} />
      <div className={styles.rooms}>
        {DEFAULT_ROOM_KEYS.map((k) => {
          const on = f.rooms.includes(k);
          const locked = k === 'general';
          return (
            <button
              key={k}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={locked}
              className={`${styles.room} ${on ? styles.roomOn : ''} ${locked ? styles.locked : ''}`}
              onClick={() => !locked && toggle(k, on)}
            >
              <span className={`${styles.box} ${on ? styles.boxOn : ''}`}>{on ? '✓' : ''}</span>
              <span className={styles.roomText}>
                <span className={styles.roomName}># {t(`room.${k}`)}</span>
                <span className={styles.roomDesc}>{t(`room.${k}Desc`)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {f.extraRooms.map((x, i) => (
        <div key={i} className={styles.extra}>
          <div className={styles.hashInput}>
            <span className={styles.hash}>#</span>
            <input
              className={styles.bare}
              value={x.name}
              placeholder={t('roomNamePh')}
              aria-label={t('roomNamePh')}
              onChange={(e) => patchExtra(i, { name: e.target.value.replace(/^#\s*/, '') })}
            />
          </div>
          <input
            className={styles.small}
            value={x.description}
            placeholder={t('roomDescPh')}
            aria-label={t('roomDescPh')}
            onChange={(e) => patchExtra(i, { description: e.target.value })}
          />
          <button
            type="button"
            title={t('removeRoom')}
            aria-label={t('removeRoom')}
            className={styles.rmRoom}
            onClick={() => set({ extraRooms: f.extraRooms.filter((_, j) => j !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addRoom}
        onClick={() => set({ extraRooms: [...f.extraRooms, { name: '', description: '' }] })}
      >
        {t('addRoom')}
      </button>
    </div>
  );
}

export function RuleFields({ f, set }: Props) {
  const t = useTranslations('groups.form');
  return (
    <div className={styles.field}>
      {t('rules')}
      {f.rules.map((r, i) => (
        <div key={i} className={styles.rule}>
          <span className={styles.ruleN}>{i + 1}.</span>
          <input
            className={styles.input}
            value={r}
            aria-label={t('rule', { n: i + 1 })}
            onChange={(e) => set({ rules: f.rules.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <button
            type="button"
            className={styles.ruleX}
            aria-label={t('removeRule', { n: i + 1 })}
            onClick={() => set({ rules: f.rules.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.link}
        onClick={() => set({ rules: [...f.rules, ''] })}
      >
        {t('addRule')}
      </button>
    </div>
  );
}
