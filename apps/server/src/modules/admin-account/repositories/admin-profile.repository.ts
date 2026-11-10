import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { AdminUpdateProfileRequest } from '@opchub/shared/api';

/** Self-service writes use the PK and an expected version/hash to prevent lost security updates. */
@Injectable()
export class AdminProfileRepository {
  async lockAvatar(tx: DbTx, id: string) {
    await tx.$queryRaw`SELECT id FROM admin_users WHERE id = ${id} FOR UPDATE`;
    return tx.adminUser.findUniqueOrThrow({ where: { id }, select: { avatarUrl: true } });
  }

  async updateProfile(tx: DbTx, id: string, version: number, body: AdminUpdateProfileRequest) {
    const result = await tx.adminUser.updateMany({
      where: { id, permVersion: version, status: 'active', deletedAt: null },
      data: {
        name: body.name,
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
    });
    return result.count;
  }

  async updatePassword(tx: DbTx, id: string, previousHash: string, passwordHash: string) {
    const rows = await tx.$queryRaw<{ perm_version: number }[]>`
      UPDATE admin_users SET password_hash = ${passwordHash}, perm_version = perm_version + 1,
        updated_at = now()
      WHERE id = ${id} AND password_hash = ${previousHash}
        AND status = 'active' AND deleted_at IS NULL AND NOT must_change_pwd
      RETURNING perm_version`;
    return rows[0]?.perm_version ?? null;
  }
}
