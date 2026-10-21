import { describe, expect, it } from 'vitest';
import { botSettingsPatchSchema, botSettingsSchema } from './bot';

describe('REQ-208 partial bot settings must not apply full-settings defaults', () => {
  it.each([{}, { enabled: true }, { topics: ['New topic'] }, { delayMinutes: 2 }])(
    'preserves omitted toggle keys: %j',
    (patch) => expect(botSettingsPatchSchema.parse(patch)).toEqual(patch),
  );
  it('retains explicit false and does not default the other omitted toggle', () => {
    expect(botSettingsPatchSchema.parse({ autoGenerate: false })).toEqual({ autoGenerate: false });
    expect(botSettingsPatchSchema.parse({ replyToMembers: false })).toEqual({
      replyToMembers: false,
    });
  });
  it('still supplies legacy defaults when reading full stored settings', () => {
    expect(botSettingsSchema.parse({ enabled: true, topics: [], delayMinutes: 1 })).toMatchObject({
      autoGenerate: true,
      replyToMembers: true,
    });
  });
});
