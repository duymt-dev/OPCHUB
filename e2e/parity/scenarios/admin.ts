import type { Scenario } from '../types';
import { ADMIN_CONTENT } from './admin-content';
import { ADMIN_GROUPS } from './admin-groups';
import { ADMIN_MEMBERS } from './admin-members';
import { ADMIN_AFFILIATE, ADMIN_RBAC } from './admin-rbac';
import { ADMIN_SETTINGS } from './admin-settings';
import { OVERVIEW_CHART_MASK } from './overview-mask';

/** Admin D-01 → D-89 — chuỗi thao tác theo coding-packs/reports/ui-parity/screens.md */
export const ADMIN_SCENARIOS: Scenario[] = [
  {
    id: 'D-01',
    name: 'Admin AppShell · Tổng quan',
    start: 'admin',
    mask: OVERVIEW_CHART_MASK,
  },
  ...ADMIN_MEMBERS,
  ...ADMIN_GROUPS,
  ...ADMIN_CONTENT,
  ...ADMIN_SETTINGS,
  ...ADMIN_RBAC,
  ...ADMIN_AFFILIATE,
];
