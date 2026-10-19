import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { TERMS_VERSION } from '../repositories/registration.repository';

/**
 * REQ-013, NR-R02 (TIP-V2-302): lưu vết đồng ý chính sách phí (không hoàn lại) khi tham gia nhóm
 * và bấm "Tôi đã chuyển khoản". community / membership-fee gọi qua service này — không ghi bảng
 * `consents` trực tiếp. Mỗi (user, kind, version) một dòng.
 */
@Injectable()
export class ConsentWriter {
  async feePolicy(tx: DbTx, userId: string, ip: string | null = null): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO consents (id, user_id, kind, version, ip)
      SELECT gen_random_uuid()::text, ${userId}, 'fee_policy'::consent_kind, ${TERMS_VERSION}, ${ip}::inet
      WHERE NOT EXISTS (
        SELECT 1 FROM consents
        WHERE user_id = ${userId} AND kind = 'fee_policy'::consent_kind AND version = ${TERMS_VERSION})`;
  }
}
