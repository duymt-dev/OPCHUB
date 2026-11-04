import { PORTAL_MY_REGION } from './scenarios/portal-my-region';
import { env } from '../env';
import { ADMIN_SCENARIOS } from './scenarios/admin';
import { AUTH_SCENARIOS } from './scenarios/auth';
import { PORTAL_SCENARIOS } from './scenarios/portal';
import type { Scenario } from './types';
import { ADMIN_REGIONAL } from './scenarios/admin-regional';

export const ALL_SCENARIOS: Scenario[] = [
  ...PORTAL_MY_REGION,
  ...ADMIN_REGIONAL,
  ...AUTH_SCENARIOS,
  ...PORTAL_SCENARIOS,
  ...ADMIN_SCENARIOS,
];

/** PARITY_IDS='A-*,D-01' → glob, phân tách bằng dấu phẩy. Trống = tất cả */
export function selectScenarios(pattern = env.PARITY_IDS): Scenario[] {
  const globs = pattern
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
    .map(
      (g) =>
        new RegExp(
          `^${g
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')}$`,
        ),
    );
  if (!globs.length) return ALL_SCENARIOS;
  return ALL_SCENARIOS.filter((s) => globs.some((r) => r.test(s.id)));
}
