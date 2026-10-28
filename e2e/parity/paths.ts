import { join } from 'node:path';
import { env } from '../env';

const E2E = join(import.meta.dirname, '..');
export const ROOT = join(E2E, '..');
// Native and MSW runs must never consume each other's pending measurements.
export const OUT_DIR = join(
  E2E,
  env.E2E_TARGET === 'server' ? '.parity-server-out' : '.parity-out',
);
export const RESULTS_DIR = join(OUT_DIR, 'results');
/** Ảnh gốc của prototype (chế độ proto-only) */
export const PROTO_DIR = join(OUT_DIR, 'proto');
/** Chế độ server (TIP-B63) ghi riêng `ui-parity/server/` — không đè kết quả MSW */
export const REPORT_DIR = join(
  ROOT,
  'coding-packs',
  'reports',
  'ui-parity',
  ...(env.E2E_TARGET === 'server' ? ['server'] : []),
);
