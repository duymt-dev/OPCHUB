import { describe, expect, it } from 'vitest';
import { botSettingsPatchSchema, scriptSchema, scriptUpsertSchema } from './bot';

const script = {
  topic: 'Minute gap',
  groupIds: ['c1'],
  lines: [{ personaId: 'p1', body: 'Hello' }],
};

describe('D-112 minute gap input boundaries', () => {
  it.each([1, 6, 60])('accepts %s minutes for scripts and automatic settings', (delayMinutes) => {
    expect(scriptUpsertSchema.parse({ ...script, delayMinutes }).delayMinutes).toBe(delayMinutes);
    expect(botSettingsPatchSchema.parse({ delayMinutes }).delayMinutes).toBe(delayMinutes);
  });
  it.each([0, -1, 1.5, 61, 120, NaN, Infinity])(
    'rejects %s minutes without silently capping at five',
    (delayMinutes) => {
      expect(scriptUpsertSchema.safeParse({ ...script, delayMinutes }).success).toBe(false);
      expect(botSettingsPatchSchema.safeParse({ delayMinutes }).success).toBe(false);
    },
  );
  it('retains five-minute default only when a script delay is omitted', () => {
    expect(scriptUpsertSchema.parse(script).delayMinutes).toBe(5);
    expect(scriptUpsertSchema.parse({ ...script, delayMinutes: '60' }).delayMinutes).toBe(60);
  });
  it('rejects an out-of-range script response rather than accepting a corrupt stored/mock value', () => {
    expect(
      scriptSchema.safeParse({
        id: 'script',
        ...scriptUpsertSchema.parse(script),
        delayMinutes: 61,
      }).success,
    ).toBe(false);
  });
});
