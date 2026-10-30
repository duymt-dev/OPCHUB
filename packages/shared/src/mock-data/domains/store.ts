import { members } from '../../fixtures';
import {
  buildBotLog,
  buildBotTopics,
  buildCategories,
  buildFees,
  buildNotifications,
  buildPersonas,
  buildScripts,
  buildServiceRequests,
  buildSmtp,
  buildWelcomeMail,
} from './admin';
import { buildGroups, buildMessages, buildReports, buildRooms } from './community';
import { buildComments, buildEvents, buildInterests, buildProjects } from './content';
import { LOCKED_USERS, MY_EVENT_REGS } from './extras';
import { resetMockPrices } from './price-config';
import { seedMockReportHistory } from './report-demo-history';
import { initializeMockDirectors } from './regional-directors/storage';
import type { GroupMemberStatus } from '../../enums';
import type { MockDb } from './store-types';
export type { MockDb } from './store-types';

/**
 * CSDL giả trong bộ nhớ cho MSW (Portal + Admin). Mỗi lần `resetMockDb()` dựng lại từ seed
 * prototype để test độc lập và ảnh chụp parity ổn định.
 */

function initialGroupMembers() {
  const out = new Map<string, Map<string, GroupMemberStatus>>();
  for (const m of members) out.set(m.id, new Map(m.groups.map((g) => [g, 'member'])));
  return out;
}

export function createMockDb(): MockDb {
  const scripts = buildScripts();
  const interests = buildInterests();
  const db: MockDb = {
    groups: buildGroups(),
    groupMembers: initialGroupMembers(),
    rooms: buildRooms(),
    messages: buildMessages(),
    botMessageMeta: new Map(),
    reports: buildReports(),
    reportMessageIds: new Map(),
    events: buildEvents(),
    eventRegs: new Map(MY_EVENT_REGS.map((e) => [e, new Set(['m1'])])),
    projects: buildProjects(),
    comments: buildComments(),
    interests,
    fees: buildFees(),
    userStatus: new Map(
      members.map((m) => [m.id, LOCKED_USERS.includes(m.id) ? 'locked' : 'active']),
    ),
    serviceRequests: buildServiceRequests(),
    serviceComments: new Map(),
    personas: buildPersonas(),
    scripts,
    botLog: buildBotLog(scripts),
    botSettings: {
      enabled: true,
      delayMinutes: 5,
      topics: buildBotTopics(),
      autoGenerate: true,
      replyToMembers: true,
    },
    categories: buildCategories(),
    welcomeMail: buildWelcomeMail(),
    smtp: buildSmtp(),
    // Prototype hiện cùng seed thông báo ở Admin (D-04) — hộp thư riêng của TK admin
    notifications: new Map([
      ['m1', buildNotifications()],
      ['admin', buildNotifications()],
    ]),
    seq: 1000,
  };
  // D-89: phòng chat như prototype v4 — không có lịch sử tin bot (native chỉ seed khi `--bot-history`)
  seedMockReportHistory(db);
  initializeMockDirectors(db);
  return db;
}

let current = createMockDb();

export const mockDb = (): MockDb => current;

/** Dựng lại từ seed (gọi trong `beforeEach` của test) */
export function resetMockDb(): void {
  resetMockPrices();
  current = createMockDb();
}

export const nextId = (prefix: string) => `${prefix}${++current.seq}`;
