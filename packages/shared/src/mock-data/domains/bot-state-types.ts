import type { BotActivity, BotScript, BotThread, BotSchedule } from '../../api-domains';
import type { MockReplyWorkflow } from './bot-reply-workflow-schema';

export interface ThreadRec {
  id: string;
  scriptId: string | null;
  kind?: BotThread['kind'];
  triggerMessageId?: string;
  replyRoomId?: string;
  status: BotThread['status'];
  createdAt: string;
  cursor: number;
  nextAt: number | null;
  snapshot: Pick<BotScript, 'topic' | 'groupIds' | 'lines' | 'delayMinutes'>;
}
export interface BotAuditRow {
  action: string;
  entity: 'persona' | 'script' | 'bot_thread' | 'bot_settings' | 'bot_reply_run';
  entityId: string;
  at: string;
  actorId?: string;
}
export interface BotState {
  replies: MockReplyWorkflow;
  schedule: BotSchedule;
  threads: ThreadRec[];
  activity: BotActivity[];
  activityMessages: Map<string, number>;
  todayCount: number;
  audit: BotAuditRow[];
  daily: Map<string, number>;
  stoppedAt: number | null;
  featureEnabled: boolean;
  replyTriggers: Map<string, string>;
  replyAdmissions: Map<string, number>;
  replyPosted: Map<string, number>;
  groupRate: Map<string, number[]>;
  scriptLastRunAt: Map<string, number>;
}
