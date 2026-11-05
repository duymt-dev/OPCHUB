import { Controller, Get, Patch, Post, Param, Req, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import {
  bankSettingsSchema,
  bankSettingsPatchSchema,
  bankTxnPageSchema,
  bankTxnQuerySchema,
  bankShortSchema,
  bankKeyRotateResultSchema,
  bankTestResultSchema,
  bankSimulateResultSchema,
  feeExportResponseSchema,
  type BankSettingsPatch,
  type BankTxnQuery,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, RequireAnyAdmin, type AccessClaims } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { BankReconcileAdminService } from '../services/bank-reconcile-admin.service';
import { BankKeyService } from '../services/bank-key.service';
import { BankCsvService } from '../services/bank-csv.service';

const actor = (u: AccessClaims, req: Request) => ({ id: u.sub, ip: req.ip ?? null });
@Controller('admin/settings/bank')
export class AdminBankReconcileController {
  constructor(
    private readonly bank: BankReconcileAdminService,
    private readonly keys: BankKeyService,
    private readonly csv: BankCsvService,
  ) {}
  @Get()
  @RequireAdmin('settings.general')
  async config() {
    return respond(bankSettingsSchema, await this.bank.config());
  }
  @Patch()
  @RequireAdmin('settings.general')
  async patch(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @ZodBody(bankSettingsPatchSchema) value: BankSettingsPatch,
  ) {
    return respond(bankSettingsSchema, await this.bank.patch(actor(u, req), value));
  }
  @Post('key')
  @HttpCode(200)
  @RequireAdmin('settings.general')
  async rotate(@CurrentUser() u: AccessClaims, @Req() req: Request) {
    return respond(bankKeyRotateResultSchema, await this.keys.rotate(actor(u, req)));
  }
  @Get('transactions')
  @RequireAnyAdmin('fees.view', 'settings.general')
  async list(@ZodQuery(bankTxnQuerySchema) q: BankTxnQuery) {
    return respond(bankTxnPageSchema, await this.bank.list(q));
  }
  @Post('transactions/:id/short')
  @HttpCode(204)
  @RequireAdmin('fees.action')
  async short(
    @CurrentUser() u: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(bankShortSchema) body: { note: string },
  ) {
    await this.bank.short(actor(u, req), id, body.note);
  }
  @Post('test')
  @HttpCode(200)
  @RequireAdmin('settings.general')
  async test() {
    return respond(bankTestResultSchema, await this.bank.test());
  }
  @Post('simulate')
  @HttpCode(200)
  @RequireAdmin('settings.general')
  async simulate(@CurrentUser() u: AccessClaims, @Req() req: Request) {
    return respond(bankSimulateResultSchema, await this.bank.simulate(actor(u, req)));
  }
  @Post('export')
  @HttpCode(200)
  @RequireAdmin('fees.action')
  async export(@CurrentUser() u: AccessClaims, @Req() req: Request) {
    return respond(feeExportResponseSchema, await this.csv.export(actor(u, req)));
  }
}
