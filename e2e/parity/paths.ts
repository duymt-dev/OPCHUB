import { join } from 'node:path';

const E2E = join(import.meta.dirname, '..');
export const ROOT = join(E2E, '..');
export const OUT_DIR = join(E2E, '.parity-out');
export const RESULTS_DIR = join(OUT_DIR, 'results');
/** Ảnh gốc của prototype (chế độ proto-only) */
export const PROTO_DIR = join(OUT_DIR, 'proto');
export const REPORT_DIR = join(ROOT, 'coding-packs', 'reports', 'ui-parity');
