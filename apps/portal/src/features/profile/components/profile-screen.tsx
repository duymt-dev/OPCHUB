'use client';

import { ErrorState, Icon, PageHeader, PageSkeleton, Tabs } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useProfile } from '../hooks/use-profile';
import { useProfileForm } from '../hooks/use-profile-form';
import { useProfileTab } from '../hooks/use-profile-tab';
import type { Profile, ProfileTab } from '../types';
import { ActivityTab } from './activity-tab';
import { BusinessTab } from './business-tab';
import { InfoTab } from './info-tab';
import { ProfileCard } from './profile-card';
import styles from './profile.module.css';
import { SecurityTab } from './security-tab';

/** P-89 → P-95: Hồ sơ cá nhân (orchestrator) — tab trên URL `?tab=` */
export function ProfileScreen() {
  const tState = useTranslations('common.state');
  const profile = useProfile();

  if (profile.isError)
    return (
      <ErrorState
        title={tState('error')}
        retryLabel={tState('retry')}
        onRetry={() => void profile.refetch()}
      />
    );
  if (!profile.data) return <PageSkeleton />;
  return <ProfileBody profile={profile.data} />;
}

function ProfileBody({ profile }: { profile: Profile }) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [rawTab, setTab] = useProfileTab();
  const form = useProfileForm(profile);
  const biz = profile.business;
  // Tab DN chỉ có với TK doanh nghiệp
  const tab: ProfileTab = rawTab === 'business' && !biz ? 'info' : rawTab;

  const items = [
    { key: 'info' as const, label: t('tabs.info') },
    ...(biz ? [{ key: 'business' as const, label: t('tabs.business') }] : []),
    { key: 'activity' as const, label: t('tabs.activity') },
    { key: 'security' as const, label: t('tabs.security') },
  ];

  return (
    <>
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.sub')}
        extra={
          <div className={styles.dateRange}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {t('page.dateRange')}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </div>
        }
      />
      <div className={styles.screen}>
        <div className={styles.side}>
          <ProfileCard
            profile={profile}
            onTab={setTab}
            onProjects={() => router.push('/projects/mine')}
          />
        </div>
        <div className={styles.main}>
          <div className={styles.tabs}>
            <Tabs
              items={items}
              activeKey={tab}
              onChange={setTab}
              ariaLabel={t('tabs.label')}
              idPrefix="profile"
            />
          </div>
          <div
            className={styles.panel}
            role="tabpanel"
            id={`profile-panel-${tab}`}
            aria-labelledby={`profile-tab-${tab}`}
          >
            {tab === 'info' ? <InfoTab form={form} isBiz={!!biz} /> : null}
            {tab === 'business' && biz ? <BusinessTab form={form} business={biz} /> : null}
            {tab === 'activity' ? <ActivityTab /> : null}
            {tab === 'security' ? (
              <SecurityTab linked={profile.linkedSso} hasPassword={profile.hasPassword} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
