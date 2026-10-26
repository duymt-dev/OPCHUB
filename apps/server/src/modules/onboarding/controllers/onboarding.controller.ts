import { Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import {
  type Onboarding,
  type OnboardingFlag,
  onboardingFlagParamSchema,
  onboardingSchema,
} from '@opchub/shared/api-domains';
import type { Response } from 'express';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { AppError } from '@/common/errors';
import { respond } from '@/common/http/zod';
import { OnboardingService } from '../services/onboarding.service';

const flagOf = (raw: string): OnboardingFlag => {
  const r = onboardingFlagParamSchema.safeParse(raw);
  if (!r.success) throw new AppError('NOT_FOUND', 'Không tìm thấy bước khởi đầu');
  return r.data;
};

/** UP-04 Hướng dẫn bắt đầu: bước 1 là đóng phí nên đọc được khi chưa đóng phí (D-85) */
@Controller('me/onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @SkipMembershipFee()
  @Get()
  async mine(
    @CurrentUser() user: AccessClaims,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Onboarding | undefined> {
    const o = await this.onboarding.mine(user.sub);
    if (!o) {
      res.status(204);
      return undefined;
    }
    return respond(onboardingSchema, o);
  }

  /** D-85: cờ "khám phá" / "chia sẻ link" — idempotent */
  @SkipMembershipFee()
  @Post('flags/:key')
  @HttpCode(204)
  async flag(@CurrentUser() user: AccessClaims, @Param('key') key: string): Promise<void> {
    await this.onboarding.flag(user.sub, flagOf(key));
  }
}
