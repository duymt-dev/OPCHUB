'use client';

import { phoneCountries } from '@opchub/shared/fixtures';
import { Icon, MeAvatar, UploadImage, useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useUploadErrorText } from '@/i18n/ui-labels';
import { uploadAvatar } from '../api';
import { useUpdateProfile } from '../hooks/use-profile';
import { vnDate } from '../model';
import type { Profile, ProfileTab } from '../types';
import styles from './profile-card.module.css';
import { Tag } from './tag';

interface Props {
  profile: Profile;
  onTab: (tab: ProfileTab) => void;
}

/** Thẻ trái: ảnh đại diện (đổi qua UploadImage), tên, loại TK, trạng thái, thống kê Nhóm / Sự kiện (v4), liên hệ */
export function ProfileCard({ profile: p, onTab }: Props) {
  const t = useTranslations('profile');
  const toast = useToast();
  const errorText = useUploadErrorText();
  const update = useUpdateProfile();
  const isBiz = p.accountType === 'business';
  const sub = p.business
    ? [p.business.position, p.business.companyName].filter(Boolean).join(' · ')
    : p.persona || t('card.member');

  const stats = [
    { n: p.stats.groups, label: t('card.statGroups'), go: () => onTab('activity') },
    { n: p.stats.events, label: t('card.statEvents'), go: () => onTab('activity') },
  ];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cover} />
        <div className={styles.body}>
          <div className={styles.avatarWrap}>
            <UploadImage
              label={t('card.changeAvatar')}
              tooLargeMessage={t('card.avatarTooLarge')}
              upload={uploadAvatar}
              onError={(m) => toast(errorText(m, t('card.avatarTooLarge')))}
              onChange={(url) =>
                update.mutate({ avatarUrl: url }, { onSuccess: () => toast(t('toast.avatar')) })
              }
              trigger={
                <span className={styles.avatar} title={t('card.changeAvatar')}>
                  <MeAvatar name={p.fullName} size={96} src={p.avatarUrl} />
                  <span className={styles.camera}>
                    <Icon name="camera" size={14} />
                  </span>
                </span>
              }
            />
          </div>
          <h2 className={styles.name}>{p.fullName}</h2>
          <div className={styles.tags}>
            <Tag tone={isBiz ? 'blue' : 'violet'}>
              {t(`card.${isBiz ? 'business' : 'personal'}`)}
            </Tag>
            <Tag tone={p.status === 'locked' ? 'red' : 'green'}>
              {t(`card.${p.status === 'locked' ? 'locked' : 'active'}`)}
            </Tag>
          </div>
          <div className={styles.sub}>{sub}</div>
          <div className={styles.stats}>
            {stats.map((s) => (
              <button key={s.label} type="button" className={styles.stat} onClick={s.go}>
                <b>{s.n}</b>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ContactCard profile={p} />
    </>
  );
}

const dialOf = (cc: string) => phoneCountries.find((c) => c.id === cc)?.dial ?? '';

/** Khối "Liên hệ": email, SĐT kèm cờ, ngày tham gia */
function ContactCard({ profile: p }: { profile: Profile }) {
  const t = useTranslations('profile.card');
  return (
    <div className={styles.contact}>
      <span className={styles.contactTitle}>{t('contact')}</span>
      <div className={styles.row}>
        <Icon name="mail" size={15} stroke="rgba(0,0,0,0.45)" />
        {p.email}
      </div>
      <div className={styles.row}>
        <img
          className={styles.flag}
          src={`https://flagcdn.com/w80/${p.phone.country}.png`}
          alt=""
        />
        {`${dialOf(p.phone.country)} ${p.phone.number}`}
      </div>
      <div className={styles.row}>
        <Icon name="calendar" size={15} stroke="rgba(0,0,0,0.45)" />
        <span>{t('joined')}</span>
        <span>{vnDate(p.joinedAt)}</span>
      </div>
    </div>
  );
}
