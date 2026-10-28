import { describe, expect, it } from 'vitest';
import {
  botReplyRunSchema,
  botReplySettingsPatchSchema,
  botReplySettingsSchema,
  DEFAULT_BOT_REPLY_SETTINGS,
} from './bot-replies';

describe('D-112 reply settings and bounded progress contract', () => {
  it('retains documented defaults without coercing patch values', () => {
    expect(botReplySettingsSchema.parse(DEFAULT_BOT_REPLY_SETTINGS)).toEqual({
      autoEnabled: true,
      sampleSize: 50,
      delaySeconds: 5,
    });
    expect(botReplySettingsPatchSchema.parse({ autoEnabled: false })).toEqual({
      autoEnabled: false,
    });
    expect(botReplySettingsPatchSchema.safeParse({ delaySeconds: '5' }).success).toBe(false);
  });
  it.each([
    { sampleSize: 0 },
    { sampleSize: 201 },
    { sampleSize: 1.5 },
    { delaySeconds: 0 },
    { delaySeconds: 601 },
    { delayMinutes: 5 },
  ])('rejects %j', (input) => {
    expect(botReplySettingsPatchSchema.safeParse(input).success).toBe(false);
  });
  it('accepts inclusive sample/cadence limits', () => {
    expect(botReplySettingsPatchSchema.parse({ sampleSize: 1, delaySeconds: 1 })).toEqual({
      sampleSize: 1,
      delaySeconds: 1,
    });
    expect(botReplySettingsPatchSchema.parse({ sampleSize: 200, delaySeconds: 600 })).toEqual({
      sampleSize: 200,
      delaySeconds: 600,
    });
  });
  it('rejects impossible progress even at the API response boundary', () => {
    const run = {
      id: 'run',
      groupId: 'group',
      groupName: 'Group',
      status: 'running',
      total: 2,
      processed: 1,
      posted: 1,
      manual: true,
      createdAt: '2026-10-28T12:00:00Z',
    };
    expect(botReplyRunSchema.safeParse(run).success).toBe(true);
    expect(botReplyRunSchema.safeParse({ ...run, processed: 3 }).success).toBe(false);
    expect(botReplyRunSchema.safeParse({ ...run, posted: 2 }).success).toBe(false);
  });
});
