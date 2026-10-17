import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import {
  type GeneralSettings,
  type GeneralSettingsPatch,
  generalSettingsSchema,
  type LanguagePatch,
  type LanguageSettings,
  type SecurityPatch,
  type SecuritySettings,
  SSO_IDS,
  securitySettingsSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AuditEntry, AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AppSettingsService, type SettingKey } from '../app-settings.service';
import type { AdminActor } from './admin-actor';

/** Lưu không có `userCount` (server tính) */
const storedSecuritySchema = securitySettingsSchema.extend({
  providers: z.array(z.object({ id: z.enum(SSO_IDS), enabled: z.boolean() })),
});
type StoredSecurity = z.infer<typeof storedSecuritySchema>;

/** Lưu không có `progress` (hằng tiến độ bản dịch) */
const storedLanguagesSchema = z.object({
  defaultLocale: z.string(),
  items: z.array(z.object({ code: z.string(), enabled: z.boolean() })),
});
type StoredLanguages = z.infer<typeof storedLanguagesSchema>;

/** % bản dịch theo ngôn ngữ (prototype PCT) — cập nhật khi thêm bản dịch */
const LANG_PROGRESS: Record<string, number> = {
  zh: 90,
  'en-SG': 100,
  vi: 100,
  en: 100,
  th: 92,
  id: 88,
  ms: 86,
  fil: 74,
  my: 61,
  km: 58,
  lo: 55,
  'ms-BN': 86,
};
const SSO_LABEL: Record<(typeof SSO_IDS)[number], string> = {
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
};

/**
 * Admin Cài đặt chung / bảo mật / ngôn ngữ (`s.cfg`). Ghi `app_settings` + audit cùng transaction,
 * xoá cache sau commit.
 */
@Injectable()
export class SettingsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppSettingsService,
    private readonly audit: AuditService,
  ) {}

  general(): Promise<GeneralSettings> {
    return this.settings.general();
  }

  async patchGeneral(actor: AdminActor, patch: GeneralSettingsPatch): Promise<GeneralSettings> {
    const next = generalSettingsSchema.parse({ ...(await this.settings.general()), ...patch });
    await this.save(
      'general',
      next,
      this.entry(actor, 'settings.general', 'general', 'settings', 'cập nhật cài đặt chung'),
    );
    return next;
  }

  async security(): Promise<SecuritySettings> {
    const s = await this.settings.get('security', storedSecuritySchema);
    const counts = await this.prisma.db.authIdentity.groupBy({
      by: ['provider'],
      _count: { _all: true },
    });
    const at = new Map(counts.map((c) => [c.provider, c._count._all]));
    return { ...s, providers: s.providers.map((p) => ({ ...p, userCount: at.get(p.id) ?? 0 })) };
  }

  async patchSecurity(actor: AdminActor, patch: SecurityPatch): Promise<SecuritySettings> {
    const cur = await this.settings.get('security', storedSecuritySchema);
    const { provider, ...policy } = patch;
    const next: StoredSecurity = storedSecuritySchema.parse({
      ...cur,
      ...policy,
      providers: provider
        ? cur.providers.map((p) => (p.id === provider.id ? { ...p, enabled: provider.enabled } : p))
        : cur.providers,
    });
    const entry = provider
      ? this.entry(
          actor,
          'sso.toggle',
          provider.id,
          'sso',
          `${provider.enabled ? 'bật' : 'tắt'} đăng nhập bằng ${SSO_LABEL[provider.id]}`,
        )
      : this.entry(actor, 'security.policy', 'security', 'settings', 'cập nhật chính sách bảo mật');
    await this.save('security', next, entry);
    return this.security();
  }

  async languages(): Promise<LanguageSettings> {
    const s = await this.settings.get('languages', storedLanguagesSchema);
    return {
      defaultLocale: s.defaultLocale,
      items: s.items.map((i) => ({ ...i, progress: LANG_PROGRESS[i.code] ?? 0 })),
    };
  }

  async patchLanguages(actor: AdminActor, patch: LanguagePatch): Promise<LanguageSettings> {
    const cur = await this.settings.get('languages', storedLanguagesSchema);
    const next: StoredLanguages = { defaultLocale: cur.defaultLocale, items: [...cur.items] };
    const has = (code: string) => next.items.some((i) => i.code === code);
    let entry: AuditEntry | null = null;
    if (patch.defaultLocale) {
      const code = patch.defaultLocale;
      if (!has(code)) throw notFound('Không có ngôn ngữ này');
      next.defaultLocale = code;
      // Đặt mặc định thì bật luôn
      next.items = next.items.map((i) => (i.code === code ? { ...i, enabled: true } : i));
      entry = this.entry(
        actor,
        'language.default',
        code,
        'language',
        `đặt ${code} làm ngôn ngữ mặc định`,
      );
    }
    if (patch.toggle) {
      const { code, enabled } = patch.toggle;
      if (!has(code)) throw notFound('Không có ngôn ngữ này');
      if (!enabled && code === next.defaultLocale) {
        throw conflict('Không thể tắt ngôn ngữ mặc định');
      }
      next.items = next.items.map((i) => (i.code === code ? { ...i, enabled } : i));
      entry = this.entry(
        actor,
        'language.toggle',
        code,
        'language',
        `${enabled ? 'bật' : 'tắt'} ngôn ngữ ${code}`,
      );
    }
    if (entry) await this.save('languages', next, entry);
    return this.languages();
  }

  private async save(key: SettingKey, value: unknown, entry: AuditEntry): Promise<void> {
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      await tx.appSetting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue },
        update: { value: value as Prisma.InputJsonValue },
      });
      await this.audit.log(tx, entry);
    });
    await this.settings.invalidate(key);
  }

  private entry(
    actor: AdminActor,
    action: string,
    entityId: string,
    tag: AuditEntry['tag'],
    summary: string,
  ): AuditEntry {
    return { actorId: actor.id, action, entity: 'settings', entityId, tag, summary, ip: actor.ip };
  }
}
