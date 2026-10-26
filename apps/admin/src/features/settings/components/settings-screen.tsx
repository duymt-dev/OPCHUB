'use client';

import { ConfirmDialog, PageHeader } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { useGrants } from '@/lib/permissions';
import { can } from '@/lib/permission-model';
import { fetchCategories, fetchLanguages, fetchRoles, settingsKeys } from '../api';
import { useSettingsRoute } from '../hooks/use-settings-route';
import {
  SETTINGS_TABS,
  TAB_KEY,
  type AskConfirm,
  type ConfirmRequest,
  type SettingsTab,
} from '../types';
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
  const g = useGrants();
  // RB-R06: chỉ tab có khoá; tab trên URL không được phép → tab đầu tiên được phép
  const tabs = SETTINGS_TABS.filter((k) => can(g, TAB_KEY[k]));
  const tab = tabs.includes(params.tab) ? params.tab : (tabs[0] ?? 'audit-log');
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const close = useCallback(() => setConfirm(null), []);
  const general = can(g, 'settings.general');
  const cats = useQuery({
    queryKey: settingsKeys.categories,
    queryFn: fetchCategories,
    enabled: general,
  });
  const langs = useQuery({
    queryKey: settingsKeys.languages,
    queryFn: fetchLanguages,
    enabled: general,
  });
  const roles = useQuery({
    queryKey: settingsKeys.roles,
    queryFn: fetchRoles,
    enabled: can(g, 'settings.admins'),
  });
  const counts = {
    categories: cats.data?.length ?? 0,
    languages: langs.data?.items.filter((l) => l.enabled).length ?? 0,
    roles: roles.data?.length ?? 0,
  };

  return (
    <>
      {/* Prototype v4 ẩn ô khoảng ngày ở Cài đặt (`showRange = !aSettings`) */}
      <PageHeader title={t('title')} subtitle={t('sub')} />
      <div data-screen-label={t('screenLabel')} className={styles.layout}>
        <SettingsNav tabs={tabs} tab={tab} counts={counts} onTab={setTab} />
        <div className={styles.main}>
          <TabBody tab={tab} ask={setConfirm} />
        </div>
      </div>
      <ConfirmDialog req={confirm} onClose={close} />
    </>
  );
}
