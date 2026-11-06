import type { NeedMatchReason, NeedMatchRow, NeedType } from '../api-domains/needs';

export interface NeedMatchStore {
  field: string;
  province: string;
  intro: string;
  productNames: readonly (string | null)[] | null;
}
export interface NeedMatchCandidate {
  id: string;
  type: NeedType;
  title: string;
  description: string;
  field: string;
  fieldCustom: boolean;
  province: string;
  updatedAt: Date | string;
}

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/** Q809-2 authorized default: unique accent-folded words, bounded CPU per candidate. */
export function matchKeywords(text: string): string[] {
  return [
    ...new Set(
      fold(text)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 3),
    ),
  ].slice(0, 50);
}

export function scoreNeedMatch(store: NeedMatchStore, need: NeedMatchCandidate) {
  const reasons: NeedMatchReason[] = [];
  let score = 0;
  if (store.field && need.field === store.field && !need.fieldCustom) {
    score += 50;
    reasons.push('field');
  }
  if (store.province && need.province === store.province) {
    score += 30;
    reasons.push('province');
  }
  const keywords = matchKeywords([store.intro, ...(store.productNames ?? [])].join(' '));
  const text = fold(`${need.title} ${need.description}`);
  const count = keywords.filter((word) => text.includes(word)).length;
  if (count) {
    score += Math.min(20, 7 * count);
    reasons.push('product');
  }
  return { score, pct: Math.min(98, score), reasons };
}

/** Shared server/MSW ranking and safe response projection, never returns description. */
export function selectNeedMatches(
  store: NeedMatchStore,
  candidates: NeedMatchCandidate[],
): NeedMatchRow[] {
  return candidates
    .map((need) => ({ need, ...scoreNeedMatch(store, need) }))
    .filter((row) => row.score >= 30)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.need.updatedAt).getTime() - new Date(a.need.updatedAt).getTime() ||
        a.need.id.localeCompare(b.need.id),
    )
    .slice(0, 3)
    .map(({ need, pct, reasons }) => ({
      id: need.id,
      type: need.type,
      title: need.title,
      field: need.field,
      province: need.province,
      pct,
      reasons,
    }));
}
