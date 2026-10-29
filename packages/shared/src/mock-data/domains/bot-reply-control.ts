import {
  botReplySettingsSchema,
  type botReplySettingsPatchSchema,
  type BotReplySettings,
} from '../../api-domains/bot-replies';
import { botState } from './bot-state';
import { mockDb } from './store';
import { ok, type MockResult } from './util';
import { mockReplyScanOverview } from './bot-reply-scan';
import { mockReplyHistory } from './bot-reply-history';

export function mockReplySettings(): BotReplySettings {
  const { sampleSize, delaySeconds } = botState().replies.control;
  return { sampleSize, delaySeconds, autoEnabled: mockDb().botSettings.replyToMembers };
}

export function patchMockReplySettings(
  patch: ReturnType<typeof botReplySettingsPatchSchema.parse>,
): MockResult<BotReplySettings> {
  const parsed = botReplySettingsSchema.safeParse({ ...mockReplySettings(), ...patch });
  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Cấu hình trả lời không hợp lệ',
      fields: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  const { autoEnabled, sampleSize, delaySeconds } = parsed.data;
  mockDb().botSettings.replyToMembers = autoEnabled;
  Object.assign(botState().replies.control, { sampleSize, delaySeconds });
  return ok(parsed.data);
}

export function mockReplyOverview() {
  const settings = mockReplySettings();
  const { control, current } = botState().replies;
  return {
    settings,
    lastScanAt: control.lastScanAt,
    ...mockReplyScanOverview(settings.sampleSize),
    run: current ? structuredClone(current.value) : null,
    history: mockReplyHistory(),
  };
}
