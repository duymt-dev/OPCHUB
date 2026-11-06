import { Controller, Get } from '@nestjs/common';
import { myRegionSchema } from '@opchub/shared/api-domains';
import { CurrentUser, type AccessClaims, SkipMembershipFee } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { MyRegionService } from '../services/my-region.service';

@Controller('me/gdv')
@SkipMembershipFee()
export class MeRegionalController {
  constructor(private readonly service: MyRegionService) {}
  @Get()
  async read(@CurrentUser() user: AccessClaims) {
    return respond(myRegionSchema, await this.service.read(user.sub));
  }
}
