import { normalizeBotBulkLine } from '@opchub/shared';
import type { BotBulkItem } from '@opchub/shared/api-domains';

/** Counts the loaded result pages only; never infers unseen provider content. */
export function summarizeBulkResults(items: readonly BotBulkItem[]) {
  const lines = items.flatMap((item) => item.lines.map((line) => normalizeBotBulkLine(line.body)));
  const total = lines.length;
  const unique = new Set(lines).size;
  return { total, unique, duplicates: total - unique };
}
