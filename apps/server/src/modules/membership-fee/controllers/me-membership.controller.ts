import { Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import {
  type MyFeePeriods,
  myFeePeriodsSchema,
  type MyMembership,
  myMembershipSchema,
  type TransferConfirmResponse,
  transferConfirmResponseSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { IdempotencyService } from '@/common/idempotency';
import { MembershipFeeService } from '../services/membership-fee.service';

/** SRS §13 Membership — mở được khi chưa đóng phí (chính là màn để đóng) */
@Controller('me/membership')
export class MeMembershipController {
  constructor(
    private readonly fees: MembershipFeeService,
    private readonly idem: IdempotencyService,
  ) {}

  @SkipMembershipFee()
  @Get()
  async mine(@CurrentUser() user: AccessClaims): Promise<MyMembership> {
    return respond(myMembershipSchema, await this.fees.mine(user.sub));
  }

  /** Hồ sơ › "Gói & thanh toán" (D-89): lịch sử kỳ phí đã đóng */
  @SkipMembershipFee()
  @Get('periods')
  async periods(@CurrentUser() user: AccessClaims): Promise<MyFeePeriods> {
    return respond(myFeePeriodsSchema, await this.fees.periods(user.sub));
  }

  /** D-31: 202 — kích hoạt khi webhook ngân hàng về (`membership.updated`) */
  @SkipMembershipFee()
  @Post('transfer-confirm')
  @HttpCode(202)
  async confirm(
    @CurrentUser() user: AccessClaims,
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<TransferConfirmResponse> {
    const body = await this.idem.run(
      'transfer-confirm',
      user.sub,
      key,
      transferConfirmResponseSchema,
      async () => {
        await this.fees.assertPayer(user.sub);
        return this.fees.confirmTransfer(user.sub);
      },
    );
    return respond(transferConfirmResponseSchema, body);
  }
}
