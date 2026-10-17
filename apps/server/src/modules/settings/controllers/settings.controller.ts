import { Controller, Get, Patch, Req } from '@nestjs/common';
import {
  type GeneralSettings,
  type GeneralSettingsPatch,
  generalSettingsPatchSchema,
  generalSettingsSchema,
  type LanguagePatch,
  languagePatchSchema,
  type LanguageSettings,
  languageSettingsSchema,
  type SecurityPatch,
  securityPatchSchema,
  type SecuritySettings,
  securitySettingsSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import { type AccessClaims, CurrentUser, RequirePermission } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import type { AdminActor } from '../services/admin-actor';
import { SettingsAdminService } from '../services/settings-admin.service';

export const actorOf = (u: AccessClaims, req: Request): AdminActor => ({
  id: u.sub,
  ip: req.ip ?? null,
});

/** Admin Cài đặt chung / bảo mật / ngôn ngữ (`s.cfg`) */
@RequirePermission('s.cfg')
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsAdminService) {}

  @Get('general')
  async general(): Promise<GeneralSettings> {
    return respond(generalSettingsSchema, await this.settings.general());
  }

  @Patch('general')
  async patchGeneral(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(generalSettingsPatchSchema) body: GeneralSettingsPatch,
  ): Promise<GeneralSettings> {
    return respond(
      generalSettingsSchema,
      await this.settings.patchGeneral(actorOf(user, req), body),
    );
  }

  @Get('security')
  async security(): Promise<SecuritySettings> {
    return respond(securitySettingsSchema, await this.settings.security());
  }

  @Patch('security')
  async patchSecurity(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(securityPatchSchema) body: SecurityPatch,
  ): Promise<SecuritySettings> {
    return respond(
      securitySettingsSchema,
      await this.settings.patchSecurity(actorOf(user, req), body),
    );
  }

  @Get('languages')
  async languages(): Promise<LanguageSettings> {
    return respond(languageSettingsSchema, await this.settings.languages());
  }

  @Patch('languages')
  async patchLanguages(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @ZodBody(languagePatchSchema) body: LanguagePatch,
  ): Promise<LanguageSettings> {
    return respond(
      languageSettingsSchema,
      await this.settings.patchLanguages(actorOf(user, req), body),
    );
  }
}
