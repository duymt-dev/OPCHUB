import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MyRegionAffiliatesService } from '../services/my-region-affiliates.service';
import {
  myRegionAffiliateQuerySchema,
  myRegionAffiliatePageSchema,
  type MyRegionAffiliateQuery,
  myRegionSchema,
} from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, SkipMembershipFee } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { MyRegionService } from '../services/my-region.service';

@Controller('me/gdv')
@SkipMembershipFee()
export class MeRegionalController {
  constructor(
    private readonly service: MyRegionService,
    private readonly affiliates: MyRegionAffiliatesService,
  ) {}
  @Get()
  async read(@CurrentUser() user: AccessClaims) {
    return respond(myRegionSchema, await this.service.read(user.sub));
  }
  @Get('affiliates')
  async page(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(myRegionAffiliateQuerySchema) query: MyRegionAffiliateQuery,
  ) {
    return respond(myRegionAffiliatePageSchema, await this.affiliates.page(user.sub, query));
  }
  @Get('affiliates.csv')
  async csv(@CurrentUser() user: AccessClaims, @Req() req: Request, @Res() res: Response) {
    const csv = await this.affiliates.csv(user.sub, req.ip ?? null);
    res.setHeader('Content-Disposition', 'attachment; filename="regional-affiliates.csv"');
    res.type('text/csv; charset=utf-8').send(csv);
  }
}
