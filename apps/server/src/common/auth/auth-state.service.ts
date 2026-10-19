import { Injectable } from '@nestjs/common';
import {
  DEFAULT_ROLE_PERMISSIONS,
  MEMBERSHIP_FEE_STATUS,
  type MembershipFeeStatus,
  type PermissionKey,
  type SystemRole,
} from '@opchub/shared';
import { rolePermissionsSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RedisService } from '../redis/redis.service';

type Grants = Partial<Record<SystemRole, readonly PermissionKey[]>>;

const feeCacheSchema = z.object({
  status: z.enum(MEMBERSHIP_FEE_STATUS),
  validUntil: z.string().nullable(),
});
export type FeeState = z.infer<typeof feeCacheSchema>;

/** Phiên thành viên (`users`) hay quản trị (`admin_users`) — D-62, TIP-V2-202 */
export type Realm = 'member' | 'admin';
/** Khoá Redis tách theo realm: id `admin_users` giữ nguyên id cũ ở `users` nên không dùng chung */
const ns = (realm: Realm) => (realm === 'admin' ? 'auth:admin:' : 'auth:');

const KEY = {
  permVersion: (id: string, realm: Realm = 'member') => `${ns(realm)}perm_version:${id}`,
  locked: (id: string, realm: Realm = 'member') => `${ns(realm)}locked:${id}`,
  fee: (id: string) => `auth:fee:${id}`,
  grants: 'auth:grants',
  adminGrants: (roleId: string) => `auth:admin_grants:${roleId}`,
};

const adminGrantsSchema = z.array(z.string());
/** Cache sống lâu hơn refresh token dài nhất (30 ngày, D-34) */
const TTL_SEC = 31 * 24 * 3600;

/**
 * Trạng thái phiên trong Redis để guard KHÔNG truy vấn DB (S-03):
 * - perm_version: tăng khi khoá / đổi quyền / đổi mật khẩu → token cũ bị từ chối
 * - locked: TK bị khoá (realm `admin` dùng tiền tố `auth:admin:`)
 * - fee: trạng thái phí mới nhất (ghi đè claim khi phí đổi, B14)
 * - grants: ma trận quyền theo vai trò (bust khi Cài đặt đổi, B40)
 * - admin_grants:<roleId>: 25 khoá RBAC Admin theo vai trò (D-52, TIP-V2-201; guard đọc ở TIP-V2-203)
 */
@Injectable()
export class AuthStateService {
  constructor(private readonly redis: RedisService) {}

  async permVersion(userId: string, realm: Realm = 'member'): Promise<number | null> {
    const v = await this.redis.client.get(KEY.permVersion(userId, realm));
    return v === null ? null : Number(v);
  }

  async setPermVersion(userId: string, version: number, realm: Realm = 'member'): Promise<void> {
    await this.redis.client.set(KEY.permVersion(userId, realm), String(version), 'EX', TTL_SEC);
  }

  async isLocked(userId: string, realm: Realm = 'member'): Promise<boolean> {
    return (await this.redis.client.exists(KEY.locked(userId, realm))) === 1;
  }

  async setLocked(userId: string, locked: boolean, realm: Realm = 'member'): Promise<void> {
    if (locked) await this.redis.client.set(KEY.locked(userId, realm), '1', 'EX', TTL_SEC);
    else await this.redis.client.del(KEY.locked(userId, realm));
  }

  /** Ghi perm_version mới cho nhiều user (đổi quyền vai trò) — một pipeline */
  async bumpVersions(rows: readonly { id: string; permVersion: number }[]): Promise<void> {
    if (!rows.length) return;
    const p = this.redis.client.pipeline();
    for (const r of rows) p.set(KEY.permVersion(r.id), String(r.permVersion), 'EX', TTL_SEC);
    await p.exec();
  }

  /** Khoá/mở hàng loạt: một pipeline Redis (không lệnh trong vòng lặp) */
  async applyStatus(rows: readonly { id: string; permVersion: number }[], locked: boolean) {
    if (!rows.length) return;
    const p = this.redis.client.pipeline();
    for (const r of rows) {
      p.set(KEY.permVersion(r.id), String(r.permVersion), 'EX', TTL_SEC);
      if (locked) p.set(KEY.locked(r.id), '1', 'EX', TTL_SEC);
      else p.del(KEY.locked(r.id));
    }
    await p.exec();
  }

  async fee(userId: string): Promise<FeeState | null> {
    const raw = await this.redis.client.get(KEY.fee(userId));
    if (!raw) return null;
    const parsed = feeCacheSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async setFee(userId: string, fee: FeeState): Promise<void> {
    await this.redis.client.set(KEY.fee(userId), JSON.stringify(fee), 'EX', TTL_SEC);
  }

  async grants(): Promise<Grants> {
    const raw = await this.redis.client.get(KEY.grants);
    if (!raw) return DEFAULT_ROLE_PERMISSIONS;
    const parsed = rolePermissionsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_ROLE_PERMISSIONS;
  }

  async setGrants(grants: Grants): Promise<void> {
    await this.redis.client.set(KEY.grants, JSON.stringify(grants));
  }

  /** Khoá quyền RBAC Admin của vai trò; `null` = chưa có cache (nạp lại từ DB) */
  async adminGrants(roleId: string): Promise<string[] | null> {
    const raw = await this.redis.client.get(KEY.adminGrants(roleId));
    if (raw === null) return null;
    const parsed = adminGrantsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  /** Ghi quyền nhiều vai trò một pipeline (không TTL — nguồn là DB, ghi đè khi lưu ma trận) */
  async setAdminGrants(
    rows: readonly { roleId: string; keys: readonly string[] }[],
  ): Promise<void> {
    if (!rows.length) return;
    const p = this.redis.client.pipeline();
    for (const r of rows) p.set(KEY.adminGrants(r.roleId), JSON.stringify(r.keys));
    await p.exec();
  }
}

/** Chỉ theo `status` — paywall dùng `isFeeUsable` (so `valid_until` tức thời, D-57) */
export const isFeeActive = (s: MembershipFeeStatus) => s === 'active' || s === 'expiring';
export { effectiveFeeStatus, isFeeUsable } from './fee-access';
