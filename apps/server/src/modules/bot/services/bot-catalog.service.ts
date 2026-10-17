import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type {
  BotScript,
  Persona,
  personaUpsertSchema,
  scriptUpsertSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PERSONA_SELECT, toScript } from '../bot.mapper';

type PersonaIn = z.output<typeof personaUpsertSchema>;
type ScriptIn = z.output<typeof scriptUpsertSchema>;
export interface Actor {
  id: string;
  ip: string | null;
}

const SCRIPT_SELECT = {
  id: true,
  topic: true,
  groupIds: true,
  lines: true,
  enabled: true,
  type: true,
  delayMinutes: true,
  runAt: true,
  inviteReal: true,
} as const;

/** Persona + kịch bản (`c.mod`, D-36 → D-41). Id `ps<n>` / `sc<n>` từ sequence; audit tag `moderation` */
@Injectable()
export class BotCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  personas(): Promise<Persona[]> {
    return this.prisma.db.persona.findMany({
      select: PERSONA_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async scripts(): Promise<BotScript[]> {
    const rows = await this.prisma.db.botScript.findMany({
      select: SCRIPT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toScript);
  }

  createPersona(actor: Actor, d: PersonaIn): Promise<Persona> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const id = await this.nextId(tx, 'persona_seq', 'ps');
      const p = await tx.persona.create({ data: { id, ...d }, select: PERSONA_SELECT });
      await this.log(tx, actor, 'persona.create', 'persona', id, `thêm persona ${p.name}`);
      return p;
    });
  }

  updatePersona(actor: Actor, id: string, d: PersonaIn): Promise<Persona> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const r = await tx.persona.updateManyAndReturn({
        where: { id },
        data: d,
        select: PERSONA_SELECT,
      });
      const p = r[0];
      if (!p) throw notFound('Không tìm thấy persona');
      await this.log(tx, actor, 'persona.update', 'persona', id, `cập nhật persona ${p.name}`);
      return p;
    });
  }

  /** Tin cũ giữ lại (FK SET NULL); kịch bản giữ dòng thoại với tên giữ chỗ (Q-G4d-4) */
  removePersona(actor: Actor, id: string): Promise<{ id: string }> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.$queryRaw<{ name: string }[]>`
        DELETE FROM personas WHERE id = ${id} RETURNING name`;
      const p = rows[0];
      if (!p) throw notFound('Không tìm thấy persona');
      await this.log(tx, actor, 'persona.delete', 'persona', id, `xoá persona ${p.name}`);
      return { id };
    });
  }

  createScript(actor: Actor, d: ScriptIn): Promise<BotScript> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const id = await this.nextId(tx, 'bot_script_seq', 'sc');
      const r = await tx.botScript.create({
        data: { id, ...this.scriptData(d) },
        select: SCRIPT_SELECT,
      });
      await this.log(tx, actor, 'script.create', 'script', id, `thêm kịch bản ${r.topic}`);
      return toScript(r);
    });
  }

  updateScript(actor: Actor, id: string, d: ScriptIn): Promise<BotScript> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.botScript.updateManyAndReturn({
        where: { id },
        data: this.scriptData(d),
        select: SCRIPT_SELECT,
      });
      const r = rows[0];
      if (!r) throw notFound('Không tìm thấy kịch bản');
      await this.log(tx, actor, 'script.update', 'script', id, `cập nhật kịch bản ${r.topic}`);
      return toScript(r);
    });
  }

  /** Hội thoại của kịch bản xoá theo (FK cascade) */
  removeScript(actor: Actor, id: string): Promise<{ id: string }> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.$queryRaw<{ topic: string }[]>`
        DELETE FROM bot_scripts WHERE id = ${id} RETURNING topic`;
      const r = rows[0];
      if (!r) throw notFound('Không tìm thấy kịch bản');
      await this.log(tx, actor, 'script.delete', 'script', id, `xoá kịch bản ${r.topic}`);
      return { id };
    });
  }

  private scriptData(d: ScriptIn) {
    return {
      topic: d.topic,
      groupIds: [...new Set(d.groupIds)],
      lines: d.lines.map((l) => ({ personaId: l.personaId, body: l.body })),
      enabled: d.enabled,
      type: d.type,
      delayMinutes: d.delayMinutes,
      runAt: d.runAt ? new Date(d.runAt) : null,
      inviteReal: d.inviteReal,
    };
  }

  private async nextId(tx: DbTx, seq: 'persona_seq' | 'bot_script_seq', prefix: string) {
    const r =
      seq === 'persona_seq'
        ? await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('persona_seq') AS n`
        : await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('bot_script_seq') AS n`;
    return `${prefix}${String(r[0]?.n ?? 0)}`;
  }

  log(tx: DbTx, actor: Actor, action: string, entity: string, id: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity,
      entityId: id,
      tag: 'moderation',
      summary,
      ip: actor.ip,
    });
  }
}
