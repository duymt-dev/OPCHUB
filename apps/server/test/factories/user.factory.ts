import type {
  AccountType,
  AdminPermissionKey,
  MembershipFeeStatus,
  SystemRole,
} from '@opchub/shared';
import { argon2id, hash } from 'argon2';
import { randomInt, randomUUID } from 'node:crypto';
import type { TestApp } from '../setup/test-app';

export interface UserSpec {
  password?: string;
  /** TK quản trị với vai trò tự tạo đúng các khoá này (RB-R05, TIP-V2-202) — bỏ qua `systemRole` */
  adminPermissions?: readonly AdminPermissionKey[];
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
  /** D-62 (TIP-V2-202): `systemRole` khác `member` → TK quản trị ở `admin_users` */
  realm: 'member' | 'admin';
}

/** Vai trò cũ → vai trò RBAC hệ thống (`moderator` ≈ Giảng viên: xem TV, nhóm, kiểm duyệt, sự kiện) */
const ADMIN_ROLE_OF: Record<Exclude<SystemRole, 'member'>, string> = {
  super_admin: 'super_admin',
  admin: 'admin',
  moderator: 'lecturer',
};

/** Vai trò tự tạo của factory — `removeTestRoles` dọn */
export const TEST_ROLE_PREFIX = 'Vai trò thử ';

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
  const role = spec.adminPermissions ? 'custom' : (spec.systemRole ?? 'member');
  if (role === 'member') return { id, email, phone, password, realm: 'member' };
  // Như migration 20261019100000: TK quản trị ở `admin_users` (cùng id), dòng `users` xoá mềm
  // giữ cho FK (audit, nhóm làm chủ…)
  const r =
    role === 'custom'
      ? await t.prisma.db.adminRole.create({
          data: {
            name: `${TEST_ROLE_PREFIX}${tag}`,
            permissions: {
              create: (spec.adminPermissions ?? []).map((permissionKey) => ({ permissionKey })),
            },
          },
          select: { id: true },
        })
      : await t.prisma.db.adminRole.findUniqueOrThrow({
          where: { key: ADMIN_ROLE_OF[role] },
          select: { id: true },
        });
  await t.prisma.db.$transaction([
    t.prisma.db.adminUser.create({
      data: {
        id,
        name: `Quản trị thử ${seq}`,
        email,
        roleId: r.id,
        passwordHash: cachedHash.hash,
        mustChangePwd: false,
        status: spec.status ?? 'active',
      },
    }),
    t.prisma.db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `${id}@moved.invalid`,
        phone: null,
        passwordHash: null,
      },
    }),
  ]);
  return { id, email, phone, password, realm: 'admin' };
}

/** Đăng nhập đúng cổng theo realm → access token */
export async function loginOf(
  t: TestApp,
  u: Pick<CreatedUser, 'email' | 'password'> & { realm?: CreatedUser['realm'] },
): Promise<Response> {
  return t.call(u.realm === 'admin' ? '/admin/auth/login' : '/auth/login', {
    method: 'POST',
    json: { identifier: u.email, password: u.password },
  });
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
    ...(await t.redis.client.keys('opchub:pwreset:*')),
    ...(await t.redis.client.keys('opchub:idem:*')),
    ...(await t.redis.client.keys('opchub:socket:conn:*')),
  ];
  // keys() trả khoá đầy đủ; client có keyPrefix nên phải bỏ prefix khi del
  const strip = (k: string) => k.replace(/^opchub:/, '');
  const all = [...keys, ...throttle].map(strip);
  if (all.length) await t.redis.client.del(...all);
}

/** Gán Mã TV thật (TV + 6 số từ member_code_seq) để test đối soát D-41 */
export async function assignMemberCode(t: TestApp, userId: string): Promise<string> {
  const [row] = await t.prisma.db.$queryRaw<{ code: string }[]>`
    SELECT 'TV' || lpad(nextval('member_code_seq')::text, 6, '0') AS code`;
  if (!row) throw new Error('Không sinh được Mã TV');
  await t.prisma.db.user.update({ where: { id: userId }, data: { memberCode: row.code } });
  return row.code;
}
