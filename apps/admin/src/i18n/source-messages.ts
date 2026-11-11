import affiliate from '../../messages/vi/affiliate.json';
import auth from '../../messages/vi/auth.json';
import bots from '../../messages/vi/bots.json';
import common from '../../messages/vi/common.json';
import events from '../../messages/vi/events.json';
import fees from '../../messages/vi/fees.json';
import groups from '../../messages/vi/groups.json';
import investors from '../../messages/vi/investors.json';
import marketing from '../../messages/vi/marketing.json';
import members from '../../messages/vi/members.json';
import needs from '../../messages/vi/needs.json';
import overview from '../../messages/vi/overview.json';
import projects from '../../messages/vi/projects.json';
import reports from '../../messages/vi/reports.json';
import requests from '../../messages/vi/requests.json';
import stores from '../../messages/vi/stores.json';
import settingsCore from '../../messages/vi/settings/core.json';
import settingsAccess from '../../messages/vi/settings/access.json';
import settingsMail from '../../messages/vi/settings/mail.json';
import settingsAudit from '../../messages/vi/settings/audit.json';
import settingsFinance from '../../messages/vi/settings/finance.json';
import settingsAi from '../../messages/vi/settings/ai.json';

/** Physical partition is invisible to callers and existing message types. */
export const messages = {
  affiliate,
  auth,
  bots,
  common,
  events,
  fees,
  groups,
  investors,
  marketing,
  members,
  needs,
  overview,
  projects,
  reports,
  requests,
  stores,
  settings: {
    ...settingsCore,
    ...settingsAccess,
    ...settingsMail,
    ...settingsAudit,
    ...settingsFinance,
    ...settingsAi,
  },
};

export type Messages = typeof messages;
export type Namespace = keyof Messages;
export const NAMESPACES = Object.keys(messages) as Namespace[];
export const SETTINGS_PARTS = ['core', 'access', 'mail', 'audit', 'finance', 'ai'] as const;
