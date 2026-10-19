'use client';

import { ConfirmDialog, Icon, PageHeader } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { fetchCategories, fetchLanguages, settingsKeys } from '../api';
import { useSettingsRoute } from '../hooks/use-settings-route';
import type { AskConfirm, ConfirmRequest, SettingsTab } from '../types';
import { AdminsTab } from './admins-tab';
import { AuditLogTab } from './audit-log-tab';
import { CategoriesTab } from './categories-tab';
import { GeneralTab } from './general-tab';
import { LanguagesTab } from './languages-tab';
import { RolesTab } from './roles-tab';
import { SettingsNav } from './settings-nav';
import { SmtpTab } from './smtp-tab';
import { SsoTab } from './sso-tab';
import { WelcomeMailTab } from './welcome-mail-tab';
import styles from './settings.module.css';

function TabBody({ tab, ask }: { tab: SettingsTab; ask: AskConfirm }) {
  switch (tab) {
    case 'categories':
      return <CategoriesTab ask={ask} />;
    case 'roles':
      return <RolesTab ask={ask} />;
    case 'welcome-mail':
      return <WelcomeMailTab />;
    case 'smtp':
      return <SmtpTab />;
    case 'admins':
      return <AdminsTab ask={ask} />;
    case 'audit-log':
      return <AuditLogTab />;
    case 'sso':
      return <SsoTab />;
    case 'languages':
      return <LanguagesTab />;
    default:
      return <GeneralTab />;
  }
}

/** D-66 → D-77 Cài đặt & Phân quyền: orchestrator — tab trên URL, hộp xác nhận dùng chung */
export function SettingsScreen() {
  const t = useTranslations('settings');
  const { params, setTab } = useSettingsRoute();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const close = useCallback(() => setConfirm(null), []);
  const cats = useQuery({ queryKey: settingsKeys.categories, queryFn: fetchCategories });
  const langs = useQuery({ queryKey: settingsKeys.languages, queryFn: fetchLanguages });
  const counts = {
    categories: cats.data?.length ?? 0,
    languages: langs.data?.items.filter((l) => l.enabled).length ?? 0,
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        extra={
          <div className={styles.range}>
            <Icon name="calendar" stroke="rgba(0,0,0,0.65)" />
            {t('dateRange')}
            <Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />
          </div>
        }
      />
      <div data-screen-label={t('screenLabel')} className={styles.layout}>
        <SettingsNav tab={params.tab} counts={counts} onTab={setTab} />
        <div className={styles.main}>
          <TabBody tab={params.tab} ask={setConfirm} />
        </div>
      </div>
      <ConfirmDialog req={confirm} onClose={close} />
    </>
  );
}
