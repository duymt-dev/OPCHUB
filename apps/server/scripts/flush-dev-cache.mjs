// Xoá khoá cache/trạng thái `opchub:*` trên Redis DEV (db 1) sau `seed:demo` (TIP-B62):
// unread chat, cache cài đặt/tổng quan, phiên auth, idempotency. Từ chối nếu REDIS_DB ≠ 1.
// Không in giá trị env nào. Chạy: `pnpm --filter @opchub/server flush:dev-cache`
import { existsSync, readFileSync } from 'node:fs';
import { Redis } from 'ioredis';

const file = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const get = (k) => (process.env[k] ?? file.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? '').trim();
const db = Number(get('REDIS_DB'));
if (db !== 1) {
  process.stderr.write('flush:dev-cache chỉ chạy trên Redis db 1 (dev) — dừng\n');
  process.exit(1);
}
const redis = new Redis(get('REDIS_URL') || 'redis://127.0.0.1:6379', { db });
const PATTERNS = [
  'opchub:chat:*',
  'opchub:auth:*',
  'opchub:settings:*',
  'opchub:public:*',
  'opchub:throttle:*',
  'opchub:idem:*',
  'opchub:overview*',
  'opchub:reporting:*',
  'opchub:admin:*',
  'opchub:dashboard:*',
  'opchub:welcome:*',
  'opchub:biz:*',
  'opchub:pwreset:*',
  'opchub:presence:*',
  'opchub:mail:*',
  'opchub:otp:*',
  'opchub:reg:*',
  'opchub:sso:*',
  'opchub:moderation:*',
];
let removed = 0;
for (const pattern of PATTERNS) {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    if (keys.length) removed += await redis.del(...keys);
  } while (cursor !== '0');
}
process.stdout.write(`flush:dev-cache: xoá ${removed} khoá trên db ${db}\n`);
await redis.quit();
