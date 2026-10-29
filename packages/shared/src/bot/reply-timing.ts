export const BOT_REPLY_SCAN_MS = 20_000;

/** Publication cadence is independent of script delays and never randomized upward to minutes. */
export function botReplyDelayMs(seconds: number): number {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 600)
    throw new RangeError('Invalid reply delay');
  return seconds * 1000;
}
