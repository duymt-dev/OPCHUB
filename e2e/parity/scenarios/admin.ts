import type { Scenario } from '../types';
import { ADMIN_CONTENT } from './admin-content';
import { ADMIN_GROUPS } from './admin-groups';
import { ADMIN_MEMBERS } from './admin-members';
import { ADMIN_SETTINGS } from './admin-settings';

/** Admin D-01 → D-80 — chuỗi thao tác theo coding-packs/reports/ui-parity/screens.md */
export const ADMIN_SCENARIOS: Scenario[] = [
  { id: 'D-01', name: 'Admin AppShell · Tổng quan', start: 'admin' },
  ...ADMIN_MEMBERS,
  ...ADMIN_GROUPS,
  ...ADMIN_CONTENT,
  ...ADMIN_SETTINGS,
];
