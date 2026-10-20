import { BOT_THREAD_SEED } from './extras';
import { recordMockBotMessage } from './bot-message-store';
import type { MockDb } from './store-types';
import { iso, MOCK_NOW } from './util';

/** Two historical demo discussions become real stored messages, not synthetic cards.
 * Only the first destination has known posted history; other destinations are not invented.
 */
export function seedMockBotHistory(db: MockDb): void {
  for (const thread of BOT_THREAD_SEED) {
    if (thread.st !== 'done') continue;
    const script = db.scripts.find((row) => row.id === thread.sid);
    const room = db.rooms.find((row) => row.groupId === script?.groupIds[0] && row.isDefault);
    if (!script || !room) continue;
    script.lines.forEach((line, turn) => {
      const persona = db.personas.find((row) => row.id === line.personaId);
      if (!persona) return;
      recordMockBotMessage(
        db,
        {
          id: `bot-history-${thread.id}-${room.id}-${turn}`,
          roomId: room.id,
          sender: { name: persona.name, avatarUrl: persona.avatarUrl },
          body: line.body,
          attachment: null,
          reactions: [],
          pinned: false,
          isSimulated: true,
          createdAt: iso(MOCK_NOW - thread.ago + turn),
        },
        { threadId: thread.id, turn, kind: 'script', personaId: persona.id },
      );
    });
  }
}
