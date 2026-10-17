import type { AccountType, MembershipFeeStatus, SystemRole } from '@opchub/shared';
import { argon2id, hash } from 'argon2';
import { randomInt, randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';

export interface UserSpec {
  password?: string;
  accountType?: AccountType;
  systemRole?: SystemRole;
  status?: 'active' | 'locked';
  phone?: string;
  fee?: MembershipFeeStatus | null;
}

export interface CreatedUser {
  id: string;
  email: string;
  phone: string;
  password: string;
}

let seq = 0;
let cachedHash: { password: string; hash: string } | undefined;

/** Factory dữ liệu test (testing.md: không dùng seed demo). Mỗi user email/SĐT duy nhất. */
export async function createUser(t: TestApp, spec: UserSpec = {}): Promise<CreatedUser> {
  seq += 1;
  const tag = `${Date.now().toString(36)}${seq}`;
  const password = spec.password ?? 'Test@2026pass';
  if (cachedHash?.password !== password) {
    cachedHash = { password, hash: await hash(password, { type: argon2id }) };
  }
  const id = randomUUID();
  const email = `u-${tag}@test.opchub.vn`;
  const phone = spec.phone ?? `+849${String(randomInt(1e8)).padStart(8, '0')}`;
  await t.prisma.db.user.create({
    data: {
      id,
      memberCode: `T${tag}`.slice(0, 20),
      accountType: spec.accountType ?? 'personal',
      fullName: `Người thử ${seq}`,
      email,
      phone,
      passwordHash: cachedHash.hash,
      systemRole: spec.systemRole ?? 'member',
      status: spec.status ?? 'active',
      ...(spec.fee
        ? {
            membershipFee: {
              create: {
                status: spec.fee,
                validUntil:
                  spec.fee === 'active' || spec.fee === 'expiring'
                    ? new Date(Date.now() + 200 * 86_400_000)
                    : null,
              },
            },
          }
        : {}),
    },
  });
  return { id, email, phone, password };
}

/** Xoá trạng thái Redis của test (db 2) giữa các test */
export async function flushAuthState(t: TestApp): Promise<void> {
  const keys = await t.redis.client.keys('opchub:auth:*');
  const throttle = [
    ...(await t.redis.client.keys('opchub:throttle:*')),
    ...(await t.redis.client.keys('opchub:otp:*')),
    ...(await t.redis.client.keys('opchub:reg:*')),
    ...(await t.redis.client.keys('opchub:settings:*')),
    ...(await t.redis.client.keys('opchub:public:*')),
  ];
  // keys() trả khoá đầy đủ; client có keyPrefix nên phải bỏ prefix khi del
  const strip = (k: string) => k.replace(/^opchub:/, '');
  const all = [...keys, ...throttle].map(strip);
  if (all.length) await t.redis.client.del(...all);
}
