import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import {
  FEE_UPLOAD_KINDS,
  MIME_EXT,
  type PresignRequest,
  type PresignResult,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/common/errors';
import { type AccessClaims, AuthStateService, isFeeUsable } from '@/common/auth';
import { STORAGE } from '@/common/integrations';

/** PUT có chữ ký sống 5 phút */
const PUT_TTL_SEC = 300;

/**
 * Presigned PUT (security.md › Upload): API không nhận file. Khoá có tiền tố `${kind}/${userId}/`
 * (server sinh, không dùng tên tệp người dùng) để domain dùng tệp kiểm được tệp thuộc người gửi.
 */
@Injectable()
export class UploadsService {
  constructor(
    @Inject(STORAGE) private readonly storage: StorageProvider,
    private readonly state: AuthStateService,
  ) {}

  async presign(user: AccessClaims, req: PresignRequest): Promise<PresignResult> {
    if (FEE_UPLOAD_KINDS.includes(req.kind)) await this.assertFee(user);
    const key = `${req.kind}/${user.sub}/${randomUUID()}.${MIME_EXT[req.contentType]}`;
    const uploadUrl = await this.storage.presignPut(key, req.contentType, req.size, PUT_TTL_SEC);
    return { uploadUrl, publicUrl: this.storage.publicUrl(key) };
  }

  /** TIP-V2-111: tệp/ảnh chat cần phí như gửi tin (BR-03, D-57); NĐT không dùng chat */
  private async assertFee(user: AccessClaims): Promise<void> {
    const fee = (await this.state.fee(user.sub)) ?? user.membershipFee;
    if (user.accountType !== 'investor' && isFeeUsable(fee, new Date())) return;
    throw new AppError('MEMBERSHIP_REQUIRED', 'Vui lòng đóng phí thành viên để tiếp tục');
  }
}
