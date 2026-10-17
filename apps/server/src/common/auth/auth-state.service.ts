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

const KEY = {
  permVersion: (id: string) => `auth:perm_version:${id}`,
  locked: (id: string) => `auth:locked:${id}`,
  fee: (id: string) => `auth:fee:${id}`,
  grants: 'auth:grants',
};
/** Cache sống lâu hơn refresh token dài nhất (30 ngày, D-34) */
const TTL_SEC = 31 * 24 * 3600;

/**
 * Trạng thái phiên trong Redis để guard KHÔNG truy vấn DB (S-03):
 * - perm_version: tăng khi khoá / đổi quyền / đổi mật khẩu → token cũ bị từ chối
 * - locked: TK bị khoá
 * - fee: trạng thái phí mới nhất (ghi đè claim khi phí đổi, B14)
 * - grants: ma trận quyền theo vai trò (bust khi Cài đặt đổi, B40)
 */
@Injectable()
export class AuthStateService {
  constructor(private readonly redis: RedisService) {}

  async permVersion(userId: string): Promise<number | null> {
    const v = await this.redis.client.get(KEY.permVersion(userId));
    return v === null ? null : Number(v);
  }

  async setPermVersion(userId: string, version: number): Promise<void> {
    await this.redis.client.set(KEY.permVersion(userId), String(version), 'EX', TTL_SEC);
  }

  async isLocked(userId: string): Promise<boolean> {
    return (await this.redis.client.exists(KEY.locked(userId))) === 1;
  }

  async setLocked(userId: string, locked: boolean): Promise<void> {
    if (locked) await this.redis.client.set(KEY.locked(userId), '1', 'EX', TTL_SEC);
    else await this.redis.client.del(KEY.locked(userId));
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
}

export const isFeeActive = (s: MembershipFeeStatus) => s === 'active' || s === 'expiring';
