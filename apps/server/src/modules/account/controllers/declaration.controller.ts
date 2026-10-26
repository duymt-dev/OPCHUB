import { Controller, Get, Put } from '@nestjs/common';
import {
  type DeclarationDraft,
  declarationDraftSchema,
  type DeclarationRequest,
  declarationSchema,
  type Me,
  meSchema,
} from '@opchub/shared/api';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { DeclarationService } from '../services/declaration.service';

/** V4-607: khai báo sau đăng nhập, trước Bảng giá — chưa đóng phí vẫn gọi được */
@Controller('me/declaration')
export class DeclarationController {
  constructor(private readonly declarations: DeclarationService) {}

  @SkipMembershipFee()
  @Get()
  async draft(@CurrentUser() user: AccessClaims): Promise<DeclarationDraft> {
    return respond(declarationDraftSchema, await this.declarations.draft(user.sub));
  }

  @SkipMembershipFee()
  @Put()
  async save(
    @CurrentUser() user: AccessClaims,
    @ZodBody(declarationSchema) body: DeclarationRequest,
  ): Promise<Me> {
    return respond(meSchema, await this.declarations.save(user.sub, body));
  }
}
