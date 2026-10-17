#!/usr/bin/env node
// OPCHUB — kiểm cấu trúc infra/ không cần nginx/systemd (TIP-B64). Không phụ thuộc gói ngoài.
//   node infra/scripts/check-units.mjs [infra-dir]
// - .service: có [Unit], [Service], ExecStart; .timer: [Timer] + OnCalendar|OnUnitActiveSec; .target: [Unit]
// - [Install] bắt buộc với unit được enable (không bắt với oneshot do timer kích)
// - nginx: ngoặc cân bằng, mỗi chỉ thị kết thúc bằng ';' hoặc '{', mọi proxy_pass trỏ upstream đã khai báo,
//   mọi limit_req zone đã khai báo bằng limit_req_zone
// - .ini: chỉ có dòng [section], key = value, chú thích ; #
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const errors = [];
let checked = 0;

const out = (line) => process.stdout.write(`${line}\n`);
const fail = (file, msg) => errors.push(`${relative(root, file).replaceAll('\\', '/')}: ${msg}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Parse unit systemd: { sections: Map<name, Map<key, string[]>> } — hỗ trợ dòng nối bằng '\' */
function parseUnit(file, text) {
  const sections = new Map();
  let current = null;
  const lines = text.replace(/\\\r?\n/g, ' ').split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith(';')) return;
    const sec = /^\[([A-Za-z]+)\]$/.exec(line);
    if (sec) {
      current = new Map();
      sections.set(sec[1], current);
      return;
    }
    const kv = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
    if (!kv) return fail(file, `dòng ${idx + 1} không phải Key=Value: ${line}`);
    if (!current) return fail(file, `dòng ${idx + 1} nằm ngoài section`);
    const list = current.get(kv[1]) ?? [];
    list.push(kv[2]);
    current.set(kv[1], list);
  });
  return sections;
}

function checkUnit(file) {
  const name = basename(file);
  const s = parseUnit(file, readFileSync(file, 'utf8'));
  const has = (sec, key) => (s.get(sec)?.get(key)?.length ?? 0) > 0;
  if (!s.has('Unit')) fail(file, 'thiếu [Unit]');
  if (!has('Unit', 'Description')) fail(file, 'thiếu Description');

  if (name.endsWith('.service')) {
    if (!s.has('Service')) fail(file, 'thiếu [Service]');
    if (!has('Service', 'ExecStart')) fail(file, 'thiếu ExecStart');
    const exec = s.get('Service')?.get('ExecStart')?.[0] ?? '';
    if (exec && !exec.startsWith('/')) fail(file, 'ExecStart phải là đường dẫn tuyệt đối');
    const type = s.get('Service')?.get('Type')?.[0] ?? 'simple';
    const timerDriven = type === 'oneshot';
    if (!timerDriven && !s.has('Install'))
      fail(file, 'thiếu [Install] (unit chạy thường trực cần enable)');
    if (!timerDriven && !has('Service', 'Restart')) fail(file, 'thiếu Restart=');
    if (!has('Service', 'User')) fail(file, 'thiếu User= (không chạy root)');
    if (s.get('Service')?.get('User')?.[0] === 'root') fail(file, 'User=root bị cấm');
    for (const key of ['NoNewPrivileges', 'ProtectSystem', 'PrivateTmp']) {
      if (!has('Service', key)) fail(file, `thiếu hardening ${key}=`);
    }
    if (name.startsWith('opchub-') && !timerDriven && !has('Service', 'MemoryMax')) {
      fail(file, 'thiếu MemoryMax=');
    }
    if (name.endsWith('@.service')) {
      const env = (s.get('Service')?.get('Environment') ?? []).join(' ');
      if (!env.includes('%i')) fail(file, 'unit template phải suy cổng từ %i');
    }
    if (name.startsWith('opchub-socket') && !has('Service', 'LimitNOFILE'))
      fail(file, 'socket thiếu LimitNOFILE');
  } else if (name.endsWith('.timer')) {
    if (!s.has('Timer')) fail(file, 'thiếu [Timer]');
    if (!has('Timer', 'OnCalendar') && !has('Timer', 'OnUnitActiveSec')) {
      fail(file, 'thiếu OnCalendar= hoặc OnUnitActiveSec=');
    }
    if (!s.has('Install')) fail(file, 'timer thiếu [Install]');
  } else if (name.endsWith('.target')) {
    if (!s.has('Install')) fail(file, 'target thiếu [Install]');
  }
  checked++;
}

/** Bỏ chú thích và chuỗi trong nginx conf, giữ số dòng */
function stripNginx(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let outLine = '';
      let quote = null;
      for (const ch of line) {
        if (quote) {
          if (ch === quote) quote = null;
          outLine += 'x';
          continue;
        }
        if (ch === '#') break;
        if (ch === '"' || ch === "'") {
          quote = ch;
          outLine += 'x';
          continue;
        }
        outLine += ch;
      }
      return outLine;
    })
    .join('\n');
}

function checkNginxBraces(file, clean) {
  let depth = 0;
  clean.split('\n').forEach((line, idx) => {
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth < 0) {
        fail(file, `dòng ${idx + 1}: thừa '}'`);
        depth = 0;
      }
    }
  });
  if (depth !== 0) fail(file, `ngoặc không cân bằng (còn ${depth} '{' chưa đóng)`);
}

/** Mỗi câu lệnh (gộp các dòng tiếp nối) phải kết thúc bằng ';', '{' hoặc '}' */
function checkNginxStatements(file, clean) {
  let pending = '';
  let startLine = 0;
  clean.split('\n').forEach((raw, idx) => {
    const line = raw.trim();
    if (line === '') return;
    if (pending === '') startLine = idx + 1;
    pending += ` ${line}`;
    if (/[;{}]$/.test(line)) pending = '';
  });
  if (pending.trim() !== '') fail(file, `dòng ${startLine}: câu lệnh thiếu ';'`);
}

function checkNginx(files) {
  const upstreams = new Set();
  const zones = new Set();
  const cleaned = files.map((f) => [f, stripNginx(readFileSync(f, 'utf8'))]);
  for (const [file, clean] of cleaned) {
    checkNginxBraces(file, clean);
    checkNginxStatements(file, clean);
    for (const m of clean.matchAll(/^\s*upstream\s+([A-Za-z0-9_]+)\s*\{/gm)) upstreams.add(m[1]);
    for (const m of clean.matchAll(/limit_req_zone\s+\S+\s+zone=([A-Za-z0-9_]+):/g))
      zones.add(m[1]);
    checked++;
  }
  for (const [file, clean] of cleaned) {
    for (const m of clean.matchAll(/proxy_pass\s+https?:\/\/([^/;\s]+)/g)) {
      if (!upstreams.has(m[1])) fail(file, `proxy_pass tới upstream chưa khai báo: ${m[1]}`);
    }
    for (const m of clean.matchAll(/limit_req\s+zone=([A-Za-z0-9_]+)/g)) {
      if (!zones.has(m[1])) fail(file, `limit_req dùng zone chưa khai báo: ${m[1]}`);
    }
  }
  const all = cleaned.map(([, c]) => c).join('\n');
  const required = [
    [/location\s+\/v1\/\s*\{/, 'location /v1/'],
    [
      /location\s+\/socket\.io\/\s*\{[^}]*proxy_set_header\s+Upgrade/,
      '/socket.io/ có header Upgrade',
    ],
    [/upstream\s+opchub_socket\s*\{[^}]*ip_hash;/, 'upstream socket dùng ip_hash'],
    [/upstream\s+opchub_api\s*\{[^}]*least_conn;/, 'upstream api dùng least_conn'],
    [/location\s+=\s+\/v1\/auth\/login\s*\{[^}]*limit_req\s+zone=/, 'rate limit /v1/auth/login'],
    [
      /location\s+=\s+\/v1\/webhooks\/bank\s*\{(?![^}]*limit_req)[^}]*\}/,
      'webhook bank không rate limit login',
    ],
    [/\/_next\/static\//, 'cache /_next/static'],
    [/client_max_body_size/, 'client_max_body_size'],
    [/gzip\s+on;/, 'gzip on'],
  ];
  for (const [re, label] of required) {
    if (!re.test(all)) errors.push(`nginx: thiếu ${label}`);
  }
}

function checkIni(file) {
  let section = null;
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((raw, idx) => {
      const line = raw.trim();
      if (line === '' || line.startsWith(';') || line.startsWith('#')) return;
      const sec = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
      if (sec) {
        section = sec[1];
        return;
      }
      if (!/^[A-Za-z0-9_.*-]+\s*=\s*.*$/.test(line))
        return fail(file, `dòng ${idx + 1} không phải key = value`);
      if (!section) fail(file, `dòng ${idx + 1} nằm ngoài section`);
    });
  if (basename(file) === 'pgbouncer.ini') {
    const text = readFileSync(file, 'utf8');
    if (!/^\s*pool_mode\s*=\s*transaction\s*$/m.test(text))
      fail(file, 'pool_mode phải là transaction');
    if (!/^\s*listen_addr\s*=\s*127\.0\.0\.1\s*$/m.test(text))
      fail(file, 'listen_addr phải là 127.0.0.1');
  }
  checked++;
}

/** *.env.example không được chứa giá trị trông như secret */
function checkEnvExample(file) {
  const secretKeys = /(SECRET|PASSWORD|TOKEN|ENC_KEY|ACCESS_KEY|DSN|WEBHOOK_URL)$/;
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((raw, idx) => {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(raw.trim());
      if (!m) return;
      if (secretKeys.test(m[1]) && m[2] !== '')
        fail(file, `dòng ${idx + 1}: ${m[1]} phải để trống`);
      if (m[1] === 'OTP_FIXED_CODE' && m[2] !== '')
        fail(file, 'OTP_FIXED_CODE phải trống ở production');
      if (m[1] === 'NEXT_PUBLIC_API_MOCKING' && m[2] !== 'off')
        fail(file, 'NEXT_PUBLIC_API_MOCKING phải off');
      if (/:\/\/[^:@/\s]+:(?!CHANGE_ME@)[^@/\s]+@/.test(m[2]))
        fail(file, `dòng ${idx + 1}: URL chứa mật khẩu`);
    });
  checked++;
}

/** Script shell phải bật strict mode */
function checkShell(file) {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('#!/usr/bin/env bash')) fail(file, 'thiếu shebang #!/usr/bin/env bash');
  const isLib = basename(file) === 'lib.sh';
  if (!isLib && !/^set -euo pipefail$/m.test(text)) fail(file, 'thiếu set -euo pipefail');
  if (/\b(cat|printenv)\s+[^|\n]*\/etc\/opchub\/[a-z]+\.env/.test(text))
    fail(file, 'không được in file env');
  checked++;
}

const files = walk(root);
for (const f of files) {
  const name = basename(f);
  if (/\.(service|timer|target)$/.test(name)) checkUnit(f);
  else if (name.endsWith('.ini')) checkIni(f);
  else if (name.endsWith('.env.example')) checkEnvExample(f);
  else if (name.endsWith('.sh')) checkShell(f);
}
checkNginx(
  files.filter((f) => f.endsWith('.conf') && relative(root, f).split(/[\\/]/)[0] === 'nginx'),
);

const unitsDir = join(root, 'systemd');
const requiredUnits = [
  'opchub-api@.service',
  'opchub-socket@.service',
  'opchub-worker.service',
  'opchub-portal@.service',
  'opchub-admin.service',
  'opchub.target',
  'opchub-backup.service',
  'opchub-backup.timer',
];
const present = new Set(readdirSync(unitsDir));
for (const u of requiredUnits) if (!present.has(u)) errors.push(`systemd: thiếu ${u}`);

if (errors.length > 0) {
  out(`check-units: ${errors.length} lỗi`);
  for (const e of errors) out(`  - ${e}`);
  process.exit(1);
}
out(`check-units: OK (${checked} tệp)`);
