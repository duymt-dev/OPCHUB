import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RENEWAL,
  renewalQuerySchema,
  renewalSendSchema,
  renewalSettingsPatchSchema,
  renewalSettingsSchema,
} from './renewal';

describe('REQ-620 renewal contracts', () => {
  it('allows saved all-off channels but rejects Zalo and non-booleans', () => {
    expect(
      renewalSettingsSchema.parse({ ...DEFAULT_RENEWAL, channels: { email: false, app: false } })
        .channels.email,
    ).toBe(false);
    expect(renewalSettingsPatchSchema.safeParse({ channels: { zalo: true } }).success).toBe(false);
    expect(renewalSettingsPatchSchema.safeParse({ milestones: { d7: 'true' } }).success).toBe(
      false,
    );
  });
  it.each([
    { userIds: [] },
    { userIds: ['x', 'x'] },
    { userIds: [''] },
    { all: true, userIds: ['x'] },
    { all: false },
  ])('rejects invalid send %j', (body) => {
    expect(renewalSendSchema.safeParse(body).success).toBe(false);
  });
  it('validates cursor at boundary and limits batch', () => {
    expect(renewalQuerySchema.safeParse({ cursor: 'no' }).success).toBe(false);
    expect(renewalQuerySchema.safeParse({ limit: 501 }).success).toBe(false);
    expect(renewalSendSchema.parse({ all: true })).toEqual({ all: true });
  });
});
