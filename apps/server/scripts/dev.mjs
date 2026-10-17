// Dev: build một lần, rồi tsdown watch + 3 process `node --watch` (tự restart khi dist đổi).
// Không dùng tsx/esbuild vì không sinh decorator metadata cho Nest DI.
import { spawn, spawnSync } from 'node:child_process';

const only = process.argv[2];
const entries = only ? [only] : ['api', 'socket', 'worker'];
const run = (cmd, args) =>
  spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

const first = spawnSync('pnpm', ['exec', 'tsdown'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (first.status !== 0) process.exit(first.status ?? 1);

const children = [
  run('pnpm', ['exec', 'tsdown', '--watch', '--no-clean']),
  ...entries.map((e) =>
    run('node', [
      '--watch',
      '--enable-source-maps',
      '--env-file-if-exists=.env',
      `dist/main-${e}.mjs`,
    ]),
  ),
];
const stop = () => children.forEach((c) => c.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
