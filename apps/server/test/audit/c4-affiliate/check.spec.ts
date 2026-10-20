import { describe, expect, it } from 'vitest';
import {
  AFFILIATE_TRANSITIONS,
  REFERRAL_TRANSITIONS,
  COMMISSION_TRANSITIONS,
} from '@/modules/affiliate/domain/affiliate.state';
import { checkAffiliateEdges } from './check.audit';
import { AFFILIATE_EDGES } from './index.audit';
import type { AffiliateEdge } from './types.audit';

const fixture: AffiliateEdge = {
  id: 'fixture',
  label: 'Test edge',
  implementation: [{ file: 'impl.ts', re: /transitionGuard/ }],
  trigger: { kind: 'worker', label: 'event', anchors: [{ file: 'worker.ts', re: /register/ }] },
  positive: { file: 'positive.int.spec.ts', re: /positive test/ },
  blocked: { file: 'blocked.int.spec.ts', re: /blocked test/ },
};
const sources = () =>
  new Map([
    ['impl.ts', 'transitionGuard'],
    ['worker.ts', 'register'],
    ['positive.int.spec.ts', 'positive test'],
    ['blocked.int.spec.ts', 'blocked test'],
  ]);

function graphKeys(machine: string, graph: Readonly<Record<string, readonly string[]>>) {
  return Object.entries(graph).flatMap(([from, targets]) =>
    targets.map((to) => `${machine}:${from}->${to}`),
  );
}

describe('REQ-301 REQ-306 REQ-307 REQ-309 REQ-310 C4 Affiliate verification is strict', () => {
  it('passes only a fully linked implementation, worker and both native test anchors', () => {
    const files = sources();
    const result = checkAffiliateEdges([fixture], [], (file) => files.get(file));
    expect(result.pass).toBe(1);
    expect(result.fail).toEqual([]);
  });

  it.each(['impl.ts', 'positive.int.spec.ts', 'blocked.int.spec.ts'])(
    'fails when mandatory source %s is missing',
    (missing) => {
      const files = sources();
      files.delete(missing);
      const result = checkAffiliateEdges([fixture], [], (file) => files.get(file));
      expect(result.pass).toBe(0);
      expect(result.fail).toHaveLength(1);
      expect(result.fail[0]?.where).toBe(missing);
    },
  );

  it('fails if the outbox worker registration is missing', () => {
    const files = sources();
    files.delete('worker.ts');
    const result = checkAffiliateEdges([fixture], [], (file) => files.get(file));
    expect(result.pass).toBe(0);
    expect(result.fail[0]?.what).toContain('worker registration');
  });

  it('requires every declared endpoint, not merely one alternative route', () => {
    const files = sources();
    const edge: AffiliateEdge = {
      ...fixture,
      trigger: { kind: 'http', routes: ['GET /v1/a', 'POST /v1/b'] },
    };
    const result = checkAffiliateEdges([edge], [{ method: 'GET', path: '/v1/a' }], (file) =>
      files.get(file),
    );
    expect(result.pass).toBe(0);
    expect(result.fail).toHaveLength(1);
    expect(result.fail[0]?.what).toContain('POST /v1/b');
  });

  it('is repeatable even when a source pattern has a global flag', () => {
    const files = sources();
    const edge: AffiliateEdge = {
      ...fixture,
      implementation: [{ file: 'impl.ts', re: /transitionGuard/g }],
    };
    expect(checkAffiliateEdges([edge, edge], [], (file) => files.get(file)).pass).toBe(2);
  });

  it('does not allow empty implementation or endpoint declarations to manufacture a pass', () => {
    const files = sources();
    const edge: AffiliateEdge = {
      ...fixture,
      implementation: [],
      trigger: { kind: 'http', routes: [] },
    };
    const result = checkAffiliateEdges([edge], [], (file) => files.get(file));
    expect(result.pass).toBe(0);
    expect(result.fail).toHaveLength(2);
  });

  it('registers every legal domain transition exactly once, plus the two lifecycle/rate invariants', () => {
    const expected = [
      ...graphKeys('affiliate', AFFILIATE_TRANSITIONS),
      ...graphKeys('referral', REFERRAL_TRANSITIONS),
      ...graphKeys('commission', COMMISSION_TRANSITIONS),
    ].sort();
    const actual = AFFILIATE_EDGES.flatMap((edge) =>
      edge.transition
        ? [`${edge.transition.machine}:${edge.transition.from}->${edge.transition.to}`]
        : [],
    ).sort();
    expect(actual).toEqual(expected);
    expect(new Set(AFFILIATE_EDGES.map((edge) => edge.id)).size).toBe(AFFILIATE_EDGES.length);
    expect(AFFILIATE_EDGES.map((edge) => edge.id)).toContain('agent-created');
    expect(AFFILIATE_EDGES.map((edge) => edge.id)).toContain('recorded-rate-only');
  });
});
