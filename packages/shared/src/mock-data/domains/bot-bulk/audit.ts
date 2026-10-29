import { auditBot } from '../bot-execution';
import { logSetting } from '../settings-log';

export function auditMockBulk(
  actor: string,
  action: string,
  entity: 'script' | 'bot_bulk_batch' | 'bot_bulk_item',
  id: string,
  summary: string,
) {
  auditBot(action, entity, id, actor);
  logSetting(actor, action, id, summary, 'moderation');
}
