import type { MockDb } from './store-types';
import type { BotState, ThreadRec } from './bot-state-types';
import { mockDb } from './store';
import { BOT_THREAD_SEED } from './extras';
import { iso } from './util';

const states = new WeakMap<MockDb, BotState>();

export function botState(): BotState {
  const db = mockDb();
  let state = states.get(db);
  if (!state) {
    state = {
      threads: BOT_THREAD_SEED.flatMap((seed): ThreadRec[] => {
        const script = db.scripts.find((s) => s.id === seed.sid);
        return script
          ? [
              {
                id: seed.id,
                scriptId: seed.sid,
                status: seed.st,
                createdAt: iso(Date.now() - seed.ago),
                cursor: seed.st === 'done' ? script.lines.length : 0,
                nextAt: seed.st === 'done' ? null : Date.now(),
                snapshot: structuredClone(script),
              },
            ]
          : [];
      }),
      activity: [],
      todayCount: 0,
      audit: [],
      daily: new Map(),
      stoppedAt: null,
      featureEnabled: true,
      replyTriggers: new Map(),
      replyAdmissions: new Map(),
      replyPosted: new Map(),
      groupRate: new Map(),
      scriptLastRunAt: new Map(),
    };
    states.set(db, state);
  }
  return state;
}
