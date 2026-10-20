import { describe, expect, it } from 'vitest';
import { canBotThreadTransition, type BotThreadState } from './bot-thread-status';

describe('REQ-208 D-50 bot lifecycle', () => {
  const states: BotThreadState[] = ['scheduled', 'running', 'done'];
  const allowed = new Set(['scheduled:running', 'scheduled:done', 'running:done']);

  for (const from of states) {
    for (const to of states) {
      it(`REQ-208 ${from} -> ${to} is ${allowed.has(`${from}:${to}`) ? 'allowed' : 'blocked'}`, () => {
        expect(canBotThreadTransition(from, to)).toBe(allowed.has(`${from}:${to}`));
      });
    }
  }
});
