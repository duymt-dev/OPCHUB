import type { CheckResult, Route } from '../lib.audit';
import type { AffiliateEdge, Anchor } from './types.audit';

export type ReadSource = (file: string) => string | undefined;

function locate(anchor: Anchor, read: ReadSource): string | null {
  const text = read(anchor.file);
  if (text === undefined) return null;
  const pattern = new RegExp(anchor.re.source, anchor.re.flags.replace(/[gy]/g, ''));
  const index = text.split(/\r?\n/).findIndex((line) => pattern.test(line));
  return index < 0 ? null : `${anchor.file}:${index + 1}`;
}

/** Static anchor verification only; native tests must still actually be executed. */
export function checkAffiliateEdges(
  edges: readonly AffiliateEdge[],
  routes: readonly Pick<Route, 'method' | 'path'>[],
  read: ReadSource,
): Pick<CheckResult, 'pass' | 'fail' | 'notes'> {
  const result: Pick<CheckResult, 'pass' | 'fail' | 'notes'> = {
    pass: 0,
    fail: [],
    notes: [
      `Affiliate §20: ${edges.length} additional checks; implementation, trigger and positive/blocked native anchors mandatory (not included in the legacy blocked-edge summary).`,
    ],
  };
  for (const edge of edges) {
    const before = result.fail.length;
    if (!edge.implementation.length)
      result.fail.push({
        where: edge.id,
        what: `${edge.label} — no implementation anchors declared`,
        sev: 'S2',
      });
    const required = (anchor: Anchor, kind: string): string => {
      const at = locate(anchor, read);
      if (at) return at;
      result.fail.push({
        where: anchor.file,
        what: `${edge.label} — missing ${kind} anchor`,
        sev: 'S2',
      });
      return `${anchor.file} (THIẾU)`;
    };
    const impl = edge.implementation.map((anchor) => required(anchor, 'implementation'));
    let trigger: string;
    if (edge.trigger.kind === 'worker') {
      if (!edge.trigger.anchors.length)
        result.fail.push({
          where: edge.id,
          what: `${edge.label} — no worker registration declared`,
          sev: 'S2',
        });
      const linked = edge.trigger.anchors.map((anchor) => required(anchor, 'worker registration'));
      trigger = `${edge.trigger.label}: ${linked.join('<br>')}`;
    } else {
      if (!edge.trigger.routes.length)
        result.fail.push({
          where: edge.id,
          what: `${edge.label} — no endpoint declared`,
          sev: 'S2',
        });
      trigger = edge.trigger.routes
        .map((endpoint) => {
          const exists = routes.some((route) => `${route.method} ${route.path}` === endpoint);
          if (!exists)
            result.fail.push({
              where: edge.id,
              what: `${edge.label} — missing endpoint ${endpoint}`,
              sev: 'S2',
            });
          return exists ? endpoint : `${endpoint} (KHÔNG THẤY)`;
        })
        .join('<br>');
    }
    const positive = required(edge.positive, 'positive native test');
    const blocked = required(edge.blocked, 'blocked native test');
    result.notes.push(
      `| Affiliate | ${edge.label} | ${impl.join('<br>')} | ${trigger} | ${positive} | ${blocked} |`,
    );
    if (before === result.fail.length) result.pass++;
  }
  return result;
}
