import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { SmtpMailProvider } from '@opchub/integrations';
import type { SmtpVerify } from '@opchub/shared/api-domains';
import {
  smtpSettingsSchema,
  type SmtpSettings,
  type smtpUpdateSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { SecretBox } from '@/common/crypto/secret-box';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from '../mail.service';
import { SmtpTransport } from '../smtp-transport';
import { esc } from '../templates';
import type { MailActor } from './mail-actor';

type SmtpUpdate = z.output<typeof smtpUpdateSchema>;
interface Result {
  ok: boolean;
  message: string;
}

const SELECT = {
  host: true,
  port: true,
  encryption: true,
  username: true,
  keyEnc: true,
  fromName: true,
  fromEmail: true,
  replyTo: true,
  dailyLimit: true,
  enabled: true,
} as const;

/**
 * Cấu hình SMTP (D-13). Key chỉ đi một chiều: nhận → `SecretBox.seal` → `key_enc`; API chỉ trả
 * `hasKey`. Verify ở `MAIL_PROVIDER=fake` không gọi mạng (dev/test offline).
 */
@Injectable()
export class SmtpConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly transport: SmtpTransport,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async get(): Promise<SmtpSettings> {
    const row = await this.prisma.db.smtpConfig.findUniqueOrThrow({
      where: { id: 1 },
      select: SELECT,
    });
    const { keyEnc, ...rest } = row;
    return smtpSettingsSchema.parse({ ...rest, hasKey: keyEnc !== null });
  }

  async update(actor: MailActor, body: SmtpUpdate): Promise<SmtpSettings> {
    const { key, ...rest } = body;
    const data = { ...rest, ...(key ? { keyEnc: Uint8Array.from(this.box.seal(key)) } : {}) };
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      await tx.smtpConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'smtp.update',
        entity: 'smtp',
        entityId: '1',
        tag: 'settings',
        summary: key ? 'cập nhật cấu hình SMTP và API key' : 'cập nhật cấu hình SMTP',
        ip: actor.ip,
      });
    });
    this.transport.reset();
    return this.get();
  }

  async verify(actor: MailActor, i: SmtpVerify): Promise<Result> {
    const stored = await this.prisma.db.smtpConfig.findUnique({
      where: { id: 1 },
      select: { keyEnc: true },
    });
    const key = i.key ?? (stored?.keyEnc ? this.box.open(stored.keyEnc).toString('utf8') : null);
    const ok = key !== null && (await this.probe(i, key));
    await this.prisma.db.$transaction((tx: DbTx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        action: 'smtp.verify',
        entity: 'smtp',
        entityId: '1',
        tag: 'settings',
        summary: `kiểm tra kết nối ${i.host}:${i.port}`,
        ip: actor.ip,
      }),
    );
    return ok
      ? { ok: true, message: `Xác thực thành công với ${i.host}:${i.port}` }
      : { ok: false, message: 'Không xác thực được – kiểm tra lại SMTP login / key.' };
  }

  /** Gửi thư thử qua hàng đợi (outbox) — worker gửi bằng cấu hình đang lưu */
  async test(actor: MailActor, to: string): Promise<Result> {
    const row = await this.prisma.db.smtpConfig.findUnique({
      where: { id: 1 },
      select: { keyEnc: true },
    });
    if (!row?.keyEnc) return { ok: false, message: 'Chưa cấu hình API key SMTP' };
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      await this.mail.request(tx, {
        to,
        kind: 'test',
        subject: 'Thư thử cấu hình SMTP – OPC Hub',
        html: `<p>Thư thử gửi tới ${esc(to)}. Cấu hình SMTP hoạt động.</p>`,
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'smtp.test',
        entity: 'smtp',
        entityId: '1',
        tag: 'settings',
        summary: `gửi thư thử SMTP tới ${to}`,
        ip: actor.ip,
      });
    });
    return { ok: true, message: `Đã gửi thư thử tới ${to}` };
  }

  private async probe(i: SmtpVerify, key: string): Promise<boolean> {
    if (this.env.MAIL_PROVIDER !== 'smtp') return true;
    const p = new SmtpMailProvider({
      host: i.host,
      port: i.port,
      encryption: i.encryption,
      username: i.username,
      password: key,
      fromName: this.env.MAIL_FROM_NAME,
      fromEmail: this.env.MAIL_FROM_EMAIL,
    });
    try {
      await p.verify();
      return true;
    } catch {
      return false;
    }
  }
}
