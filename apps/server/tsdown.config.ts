import { defineConfig } from 'tsdown';

/** 3 entrypoint, một app — ADR-0001 */
export default defineConfig({
  entry: ['src/main-api.ts', 'src/main-socket.ts', 'src/main-worker.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  // workspace package là nguồn TS (không build riêng) → gộp vào bundle; thư viện ngoài giữ external
  noExternal: [/^@opchub\//],
});
