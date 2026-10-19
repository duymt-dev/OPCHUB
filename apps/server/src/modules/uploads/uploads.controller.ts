import { Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type PresignRequest,
  presignRequestSchema,
  type PresignResult,
  presignResultSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, AllowRealm, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { UploadsService } from './uploads.service';

/**
 * `POST /uploads/presign` (Q-G3c-1, Q-B13-1) — ảnh đại diện đổi được cả khi chưa đóng phí;
 * kind `chat-*` kiểm phí trong service (TIP-V2-111).
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @AllowRealm('member', 'admin')
  @SkipMembershipFee()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('presign')
  @HttpCode(200)
  async presign(
    @CurrentUser() user: AccessClaims,
    @ZodBody(presignRequestSchema) body: PresignRequest,
  ): Promise<PresignResult> {
    return respond(presignResultSchema, await this.uploads.presign(user, body));
  }
}
