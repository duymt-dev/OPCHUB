import type {
  BotLogRow,
  BotScript,
  BotSettings,
  Category,
  EventItem,
  FeeRow,
  GroupItem,
  InvestorInterest,
  Message,
  Notification,
  Persona,
  ProjectComment,
  ProjectItem,
  Report,
  Room,
  ServiceRequest,
  SmtpSettings,
  WelcomeMail,
} from '../../api-domains';
import type { GroupMemberStatus, UserStatus } from '../../enums';
import type { MockBotMessageMeta } from './bot-message-types';

export interface MockDb {
  groups: Omit<GroupItem, 'myStatus'>[];
  /** userId → groupId → trạng thái thành viên nhóm */
  groupMembers: Map<string, Map<string, GroupMemberStatus>>;
  rooms: Room[];
  messages: Map<string, Message[]>;
  botMessageMeta: Map<string, MockBotMessageMeta>;
  reports: Report[];
  reportMessageIds: Map<string, string>;
  events: Omit<EventItem, 'registeredByMe'>[];
  /** eventId → userId đã đăng ký */
  eventRegs: Map<string, Set<string>>;
  projects: ProjectItem[];
  comments: ProjectComment[];
  interests: InvestorInterest[];
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
  welcomeMail: WelcomeMail;
  smtp: SmtpSettings;
  /** userId → thông báo (mới → cũ) */
  notifications: Map<string, Notification[]>;
  seq: number;
}
