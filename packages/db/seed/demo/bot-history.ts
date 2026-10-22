import { BOT_THREAD_SEED, buildScripts, MOCK_NOW, roomIdOf } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/**
 * `seed:demo -- --bot-history` (TIP-V2-560 P-01-BOTCARD): native twin of MSW
 * `seedMockBotHistory`. The two `done` demo threads become real persisted bot messages in the
 * first destination's default room (one row per turn, opening = turn 0), timed from MOCK_NOW
 * exactly like MSW. Other destinations are not invented. Opt-in so default demo data is unchanged.
 * The `scheduled` demo thread keeps its prototype state (not yet posted): its first turn is due
 * one script delay from now instead of immediately, so the worker does not post it mid-measure.
 */
export async function seedBotHistory(tx: DbTx): Promise<void> {
  const scripts = buildScripts();
  const rows = BOT_THREAD_SEED.flatMap((thread) => {
    if (thread.st !== 'done') return [];
    const script = scripts.find((s) => s.id === thread.sid);
    const groupId = script?.groupIds[0];
    if (!script || !groupId) return [];
    const roomId = roomIdOf(groupId, 'general');
    return script.lines.map((line, turn) => ({
      id: `bot-history-${thread.id}-${roomId}-${turn}`,
      roomId,
      personaId: line.personaId,
      body: line.body,
      isSimulated: true,
      botThreadId: thread.id,
      botTurn: turn,
      botKind: 'script',
      botOpening: turn === 0,
      createdAt: new Date(MOCK_NOW - thread.ago + turn),
    }));
  });
  await tx.message.createMany({ data: rows });
  for (const thread of BOT_THREAD_SEED) {
    if (thread.st !== 'scheduled') continue;
    const delay = scripts.find((s) => s.id === thread.sid)?.delayMinutes ?? 5;
    await tx.botThread.update({
      where: { id: thread.id },
      data: { nextAt: new Date(Date.now() + delay * 60_000) },
    });
  }
}
