import { Controller, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import {
  regionalBankSchema,
  regionalPayeeBankParamsSchema,
  regionalWriteResultSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, RequireAdmin } from '@/common/auth';
import { respond, ZodBody, ZodParams } from '@/common/http/zod';
import { RegionalPayeeBankService } from '../services/regional-payee-bank.service';

@Controller('admin/regional-directors')
export class AdminRegionalPayeeBankController {
  constructor(private readonly banks: RegionalPayeeBankService) {}

  @Put(':region/payees/:userId/bank')
  @RequireAdmin('affiliate.payout')
  async save(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodParams(regionalPayeeBankParamsSchema) p: z.infer<typeof regionalPayeeBankParamsSchema>,
    @ZodBody(regionalBankSchema.strict()) bank: z.infer<typeof regionalBankSchema>,
  ) {
    return respond(
      regionalWriteResultSchema,
      await this.banks.save(
        { id: user.sub, role: user.roleName ?? '', ip: req.ip ?? null },
        p.region,
        p.userId,
        bank,
      ),
    );
  }
}
