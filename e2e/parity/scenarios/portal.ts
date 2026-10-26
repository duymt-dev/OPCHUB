import type { Scenario } from '../types';
import { PORTAL_ACCOUNT } from './portal-account';
import { PORTAL_CHAT } from './portal-chat';
import { PORTAL_COMMUNITY } from './portal-community';
import { PORTAL_DECLARATION } from './portal-declaration';
import { PORTAL_EVENTS } from './portal-events';
import { PORTAL_PROJECTS } from './portal-projects';
import { PORTAL_SHELL } from './portal-shell';
import { PORTAL_NEEDS } from './portal-needs';
import { PORTAL_STORES } from './portal-stores';

/** Portal P-01 → P-95 — chuỗi thao tác theo coding-packs/reports/ui-parity/screens.md */
export const PORTAL_SCENARIOS: Scenario[] = [
  ...PORTAL_SHELL,
  ...PORTAL_COMMUNITY,
  ...PORTAL_CHAT,
  ...PORTAL_EVENTS,
  ...PORTAL_PROJECTS,
  ...PORTAL_ACCOUNT,
  ...PORTAL_DECLARATION,
  ...PORTAL_NEEDS,
  ...PORTAL_STORES,
];
