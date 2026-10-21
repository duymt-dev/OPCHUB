/** D-50: scheduled -> running -> done; stop may finish an unstarted thread. */
export const BOT_THREAD_TRANSITIONS = {
  scheduled: ['running', 'done'],
  running: ['done'],
  done: [],
} as const;

export type BotThreadState = keyof typeof BOT_THREAD_TRANSITIONS;

export function canBotThreadTransition(from: BotThreadState, to: BotThreadState): boolean {
  const allowed: readonly BotThreadState[] = BOT_THREAD_TRANSITIONS[from];
  return allowed.includes(to);
}
