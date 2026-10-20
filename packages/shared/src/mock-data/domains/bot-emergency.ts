import type { z } from 'zod';
import type { botHideMessagesSchema } from '../../api-domains';
import { auditBot, botState } from './bot-execution';
import { mockDb } from './store';
import { iso, ok } from './util';
import { logSetting } from './settings-log';

/** Synchronous mock transaction: do not advance due turns before stopping them. */
export function emergencyStopMockBot(actorId: string) {
  const db = mockDb();
  const state = botState();
  db.botSettings.enabled = false;
  const stoppedIds = new Set<string>();
  for (const thread of state.threads) {
    if (thread.status === 'done') continue;
    stoppedIds.add(thread.id);
    thread.status = 'done';
    thread.nextAt = null;
  }
  for (const row of db.botLog) if (stoppedIds.has(row.id)) row.status = 'done';
  auditBot('bot.emergency_stop', 'bot_settings', 'bot', actorId);
  logSetting(
    actorId,
    'bot.emergency_stop',
    'bot',
    `Tắt khẩn cấp bot, dừng ${stoppedIds.size} hội thoại`,
    'settings',
  );
  return ok({ enabled: false as const, stopped: stoppedIds.size });
}

/** Preserve hidden content for Admin; Portal read boundaries exclude/mask it. */
export function hideMockBotMessages(
  actorId: string,
  input: z.output<typeof botHideMessagesSchema>,
) {
  const db = mockDb();
  const selected = input.groupIds ? new Set(input.groupIds) : null;
  const eligibleRooms = new Set(
    db.rooms.filter((r) => !selected || selected.has(r.groupId)).map((r) => r.id),
  );
  const at = iso(Date.now());
  const affectedRooms = new Set<string>();
  let hidden = 0;
  for (const [roomId, messages] of db.messages) {
    if (!eligibleRooms.has(roomId)) continue;
    for (const message of messages) {
      if (!message.isSimulated || message.hiddenAt) continue;
      message.hiddenAt = at;
      affectedRooms.add(roomId);
      hidden++;
    }
  }
  auditBot('bot.hide_messages', 'bot_settings', 'bot', actorId);
  logSetting(
    actorId,
    'bot.hide_messages',
    'bot',
    `Ẩn ${hidden} tin bot trong ${affectedRooms.size} phòng`,
    'moderation',
  );
  return ok({ hidden, rooms: affectedRooms.size });
}
