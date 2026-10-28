import { nextAutoTopic, planAutoPersonas } from '../../bot/auto-plan';
import { mockPersonaDailyCount } from './bot-posting-limits';
import { reserveMockBotThread } from './bot-retention';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { iso } from './util';
import { mockBotScheduleAllows } from './bot-schedule';

/** Synchronous mock transaction matching native group ordering and quota reservations. */
export function admitAutomaticMockThreads(now: number, random = Math.random): number {
  const db = mockDb();
  const state = botState();
  const settings = db.botSettings;
  if (
    !state.featureEnabled ||
    !settings.enabled ||
    !settings.autoGenerate ||
    !mockBotScheduleAllows(now)
  )
    return 0;
  const personas = db.personas
    .filter((p) => p.enabled)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => ({ ...p, remaining: p.postsPerDay - mockPersonaDailyCount(p.id, now) }));
  const occupied = new Set(
    state.threads.filter((row) => row.status !== 'done').flatMap((row) => row.snapshot.groupIds),
  );
  const plans = db.groups
    .filter(
      (group) =>
        !occupied.has(group.id) &&
        db.rooms.some((room) => room.groupId === group.id && room.isDefault),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((group) => {
      const queue = planAutoPersonas(personas, group.id, new Date(now), random);
      const previous = state.threads
        .filter((row) => row.kind === 'auto' && row.snapshot.groupIds.includes(group.id))
        .sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id),
        )[0];
      const topic = nextAutoTopic(settings.topics, previous?.snapshot.topic);
      if (!queue.length || !topic) return [];
      for (const id of queue) {
        const persona = personas.find((p) => p.id === id);
        if (persona) persona.remaining -= 1;
      }
      return [{ groupId: group.id, groupName: group.name, queue, topic }];
    });
  let admitted = 0;
  for (const plan of plans) {
    if (!reserveMockBotThread()) break;
    const id = nextId('th');
    const createdAt = iso(now);
    state.threads.unshift({
      id,
      scriptId: null,
      kind: 'auto',
      status: 'scheduled',
      createdAt,
      cursor: 0,
      nextAt: now,
      snapshot: {
        topic: plan.topic,
        groupIds: [plan.groupId],
        lines: plan.queue.map((personaId) => ({ personaId, body: '' })),
        delayMinutes: settings.delayMinutes,
      },
    });
    db.botLog.unshift({
      id,
      scriptId: '',
      topic: plan.topic,
      groupNames: [plan.groupName],
      status: 'scheduled',
      createdAt,
    });
    admitted += 1;
  }
  return admitted;
}
