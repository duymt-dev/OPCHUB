import { RO_SAFE_PATHS, RO_WRITE_PATHS } from './ro-catalog-paths';

export interface RoLabelMatcher {
  isSafe: (value: string) => boolean;
  isWrite: (value: string) => boolean;
}

const EMPTY_MATCHER: RoLabelMatcher = {
  isSafe: () => false,
  isWrite: () => false,
};

const CACHE = new WeakMap<object, RoLabelMatcher>();

function resolvePath(root: unknown, dotPath: string): string | undefined {
  let cur: unknown = root;
  for (const part of dotPath.split('.')) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur.trim() : undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTemplate(template: string): RegExp | null {
  if (!template) return null;
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    if (ch === '{') {
      if (depth === 0) segments.push(escapeRegex(template.slice(start, i)));
      depth++;
    } else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0) {
        segments.push('.+');
        start = i + 1;
      }
    }
  }
  if (depth === 0 && start < template.length) {
    segments.push(escapeRegex(template.slice(start)));
  }
  const body = segments.join('');
  return body ? new RegExp(`^${body}$`) : null;
}

function buildPatterns(messages: object, paths: readonly string[]): RegExp[] {
  const seen = new Set<string>();
  const out: RegExp[] = [];
  for (const p of paths) {
    const raw = resolvePath(messages, p);
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const rx = compileTemplate(raw);
    if (rx) out.push(rx);
  }
  return out;
}

/** Builds and caches an active-locale write/safe label matcher from loaded `next-intl` messages. */
export function createRoMatcher(messages: unknown): RoLabelMatcher {
  if (!messages || typeof messages !== 'object') return EMPTY_MATCHER;
  const hit = CACHE.get(messages);
  if (hit) return hit;
  const safe = buildPatterns(messages, RO_SAFE_PATHS);
  const writes = buildPatterns(messages, RO_WRITE_PATHS);
  const matcher: RoLabelMatcher = {
    isSafe: (value) => Boolean(value) && safe.some((rx) => rx.test(value)),
    isWrite: (value) => Boolean(value) && writes.some((rx) => rx.test(value)),
  };
  CACHE.set(messages, matcher);
  return matcher;
}
