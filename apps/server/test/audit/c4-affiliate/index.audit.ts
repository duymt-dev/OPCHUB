import { existsSync } from 'node:fs';
import { abs, read, type CheckResult, type Route } from '../lib.audit';
import { checkAffiliateEdges } from './check.audit';
import { AFFILIATE_WORKER_EDGES } from './worker-edges.audit';
import { AFFILIATE_COMMISSION_EDGES } from './commission-edges.audit';

export const AFFILIATE_EDGES = [...AFFILIATE_WORKER_EDGES, ...AFFILIATE_COMMISSION_EDGES];

export function withAffiliateTransitions(base: CheckResult, routes: readonly Route[]): CheckResult {
  const cache = new Map<string, string | undefined>();
  const extra = checkAffiliateEdges(AFFILIATE_EDGES, routes, (file) => {
    if (!cache.has(file)) cache.set(file, existsSync(abs(file)) ? read(abs(file)) : undefined);
    return cache.get(file);
  });
  return {
    ...base,
    title: 'Transition §8 + Affiliate §20 → endpoint/worker + test',
    pass: base.pass + extra.pass,
    fail: [...base.fail, ...extra.fail],
    notes: [...base.notes, ...extra.notes],
  };
}
