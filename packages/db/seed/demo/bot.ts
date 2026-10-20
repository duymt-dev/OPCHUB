import {
  BOT_THREAD_SEED,
  buildPersonas,
  buildScripts,
  MOCK_NOW,
} from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/**
 * Domain bot (FEATURE_BOTS): persona ps1–ps6, kịch bản sc1–sc3 (id prototype; sequence bắt đầu
 * 100 nên id mới không trùng), hội thoại th1–th3 (ảnh chụp dòng thoại của kịch bản lúc chạy).
 */
export async function seedBots(tx: DbTx): Promise<void> {
  const personas = buildPersonas();
  const t0 = MOCK_NOW - 60 * 86_400_000;
  await tx.persona.createMany({
    data: personas.map((p, i) => ({
      ...p,
      createdAt: new Date(t0 + i * 1000),
      updatedAt: new Date(t0 + i * 1000),
    })),
  });
  const scripts = buildScripts();
  await tx.botScript.createMany({
    data: scripts.map((s, i) => ({
      id: s.id,
      topic: s.topic,
      groupIds: s.groupIds,
      lines: s.lines,
      enabled: s.enabled,
      type: s.type,
      delayMinutes: s.delayMinutes,
      runAt: null,
      inviteReal: s.inviteReal,
      createdAt: new Date(t0 + i * 1000),
      updatedAt: new Date(t0 + i * 1000),
    })),
  });
  await tx.botThread.createMany({
    data: BOT_THREAD_SEED.flatMap((t) => {
      const sc = scripts.find((s) => s.id === t.sid);
      if (!sc) return [];
      const at = new Date(MOCK_NOW - t.ago);
      return [
        {
          id: t.id,
          scriptId: sc.id,
          topic: sc.topic,
          groupIds: sc.groupIds,
          lines: sc.lines,
          status: t.st,
          isAuto: false,
          postedAt: t.st === 'done' ? at : null,
          cursor: t.st === 'done' ? sc.lines.length : 0,
          personaQueue: sc.lines.map((line) => line.personaId),
          nextAt: t.st === 'done' ? null : new Date(),
          createdAt: at,
          updatedAt: at,
        },
      ];
    }),
  });
}
