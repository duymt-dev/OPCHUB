import type {
  BotLogRow,
  BotScript,
  BotSettings,
  Category,
  EventItem,
  FeeRow,
  GroupItem,
  InvestorInterest,
  InvestorThreadMessage,
  JoinRequest,
  Message,
  Notification,
  Persona,
  ProjectComment,
  ProjectItem,
  Report,
  RolePermissions,
  Room,
  ServiceRequest,
  SmtpSettings,
  WelcomeMail,
} from '../../api-domains';
import type { GroupMemberStatus, UserStatus } from '../../enums';
import { members } from '../../fixtures';
import { DEFAULT_ROLE_PERMISSIONS } from '../../permissions';
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
import {
  buildGroups,
  buildJoinRequests,
  buildMessages,
  buildReports,
  buildRooms,
} from './community';
import { buildComments, buildEvents, buildInterests, buildProjects } from './content';
import { LOCKED_USERS, MY_EVENT_REGS } from './extras';

/**
 * CSDL giả trong bộ nhớ cho MSW (Portal + Admin). Mỗi lần `resetMockDb()` dựng lại từ seed
 * prototype để test độc lập và ảnh chụp parity ổn định.
 */
export interface MockDb {
  groups: Omit<GroupItem, 'myStatus'>[];
  /** userId → groupId → trạng thái thành viên nhóm */
  groupMembers: Map<string, Map<string, GroupMemberStatus>>;
  joinRequests: JoinRequest[];
  rooms: Room[];
  messages: Map<string, Message[]>;
  reports: Report[];
  events: Omit<EventItem, 'registeredByMe'>[];
  /** eventId → userId đã đăng ký */
  eventRegs: Map<string, Set<string>>;
  projects: ProjectItem[];
  comments: ProjectComment[];
  interests: InvestorInterest[];
  threadMessages: InvestorThreadMessage[];
  fees: FeeRow[];
  userStatus: Map<string, UserStatus>;
  serviceRequests: ServiceRequest[];
  serviceComments: Map<
    string,
    { id: string; authorName: string; body: string; createdAt: string }[]
  >;
  personas: Persona[];
  scripts: BotScript[];
  botLog: BotLogRow[];
  botSettings: BotSettings;
  categories: Category[];
  rolePermissions: RolePermissions;
  welcomeMail: WelcomeMail;
  smtp: SmtpSettings;
  /** userId → thông báo (mới → cũ) */
  notifications: Map<string, Notification[]>;
  seq: number;
}

function initialGroupMembers() {
  const out = new Map<string, Map<string, GroupMemberStatus>>();
  for (const m of members) out.set(m.id, new Map(m.groups.map((g) => [g, 'member'])));
  return out;
}

function initialThreadMessages(interests: InvestorInterest[]): InvestorThreadMessage[] {
  return interests.map((i) => ({
    id: `${i.id}-m0`,
    threadKey: i.id,
    senderName: i.investorName,
    fromInvestor: true,
    body: i.message,
    createdAt: i.createdAt,
  }));
}

export function createMockDb(): MockDb {
  const scripts = buildScripts();
  const interests = buildInterests();
  return {
    groups: buildGroups(),
    groupMembers: initialGroupMembers(),
    joinRequests: buildJoinRequests(),
    rooms: buildRooms(),
    messages: buildMessages(),
    reports: buildReports(),
    events: buildEvents(),
    eventRegs: new Map(MY_EVENT_REGS.map((e) => [e, new Set(['m1'])])),
    projects: buildProjects(),
    comments: buildComments(),
    interests,
    threadMessages: initialThreadMessages(interests),
    fees: buildFees(),
    userStatus: new Map(
      members.map((m) => [m.id, LOCKED_USERS.includes(m.id) ? 'locked' : 'active']),
    ),
    serviceRequests: buildServiceRequests(),
    serviceComments: new Map(),
    personas: buildPersonas(),
    scripts,
    botLog: buildBotLog(scripts),
    botSettings: { enabled: true, requireReview: true, delayMinutes: 5, topics: buildBotTopics() },
    categories: buildCategories(),
    rolePermissions: {
      admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
      moderator: [...DEFAULT_ROLE_PERMISSIONS.moderator],
      member: [...DEFAULT_ROLE_PERMISSIONS.member],
    },
    welcomeMail: buildWelcomeMail(),
    smtp: buildSmtp(),
    // Prototype hiện cùng seed thông báo ở Admin (D-04) — hộp thư riêng của TK admin
    notifications: new Map([
      ['m1', buildNotifications()],
      ['admin', buildNotifications()],
    ]),
    seq: 1000,
  };
}

let current = createMockDb();

export const mockDb = (): MockDb => current;

/** Dựng lại từ seed (gọi trong `beforeEach` của test) */
export function resetMockDb(): void {
  current = createMockDb();
}

export const nextId = (prefix: string) => `${prefix}${++current.seq}`;
