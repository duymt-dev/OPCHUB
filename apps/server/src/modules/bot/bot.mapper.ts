import {
  botStoredLinesSchema,
  botThreadSchema,
  type BotScript,
  type BotThread,
  type Persona,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';

/** `lines` JSONB lưu `[{ personaId, body }]` — parse lại khi đọc (không tin dữ liệu cũ) */
export const storedLinesSchema = botStoredLinesSchema;
export type StoredLine = z.infer<typeof storedLinesSchema>[number];

export const PERSONA_SELECT = {
  id: true,
  name: true,
  title: true,
  province: true,
  tone: true,
  groupIds: true,
  enabled: true,
  postCount: true,
  color: true,
  avatarUrl: true,
  gender: true,
  ageRange: true,
  bio: true,
  skills: true,
  postsPerDay: true,
  activeHours: true,
} as const;

export const toPersona = (p: Persona): Persona => p;

export interface ScriptRow {
  id: string;
  topic: string;
  groupIds: string[];
  lines: unknown;
  enabled: boolean;
  type: string;
  delayMinutes: number;
  runAt: Date | null;
  inviteReal: boolean;
}

export function toScript(r: ScriptRow): BotScript {
  return {
    id: r.id,
    topic: r.topic,
    groupIds: r.groupIds,
    lines: storedLinesSchema.catch([]).parse(r.lines),
    enabled: r.enabled,
    type: r.type,
    delayMinutes: r.delayMinutes,
    runAt: r.runAt?.toISOString() ?? null,
    inviteReal: r.inviteReal,
  };
}

export interface ThreadRow {
  id: string;
  scriptId: string | null;
  topic: string;
  groupIds: string[];
  lines: unknown;
  status: BotThread['status'];
  isAuto: boolean;
  createdAt: Date;
  postedAt: Date | null;
  cursor: number;
  personaQueue: string[];
  nextAt: Date | null;
  kind: string;
}

type PersonaLook = Pick<Persona, 'name' | 'title' | 'color' | 'avatarUrl'>;

/** Persona đã xoá → giữ chỗ "?" (Q-G4d-4) */
export function toThread(
  t: ThreadRow,
  personas: ReadonlyMap<string, PersonaLook>,
  groupNames: ReadonlyMap<string, string>,
): BotThread {
  return botThreadSchema.parse({
    id: t.id,
    scriptId: t.scriptId,
    topic: t.topic,
    groupIds: t.groupIds,
    groupNames: t.groupIds.map((g) => groupNames.get(g) ?? g),
    status: t.status,
    isAuto: t.isAuto,
    live: t.status === 'running',
    cursor: t.cursor,
    total: Math.max(storedLinesSchema.catch([]).parse(t.lines).length, t.personaQueue.length),
    nextAt: t.nextAt?.toISOString() ?? null,
    kind: t.kind,
    createdAt: (t.postedAt ?? t.createdAt).toISOString(),
    lines: storedLinesSchema
      .catch([])
      .parse(t.lines)
      .map((l) => {
        const p = personas.get(l.personaId);
        return {
          personaId: l.personaId,
          name: p?.name ?? '?',
          title: p?.title ?? '',
          color: p?.color ?? '#999999',
          avatarUrl: p?.avatarUrl ?? null,
          body: l.body,
        };
      }),
  });
}
