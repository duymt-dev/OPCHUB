import { describe, expect, it } from 'vitest';
import { BOT_REPLY_SCAN_MS, botReplyDelayMs } from './reply-timing';

describe('D-112 second-based reply timing', () => {
  it.each([
    [1, 1000],
    [5, 5000],
    [600, 600000],
  ])('maps %s seconds to %s ms exactly', (seconds, ms) => {
    expect(botReplyDelayMs(seconds)).toBe(ms);
  });
  it.each([0, -1, 0.5, 601, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (seconds) => {
    expect(() => botReplyDelayMs(seconds)).toThrow(RangeError);
  });
  it('scans every twenty seconds', () => expect(BOT_REPLY_SCAN_MS).toBe(20_000));
});
