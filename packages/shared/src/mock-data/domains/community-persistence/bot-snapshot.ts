import { botState } from '../bot-state';
import type { BotState } from '../bot-state-types';
import {
  isManualMockBotScenarioSeeded,
  restoreManualMockBotScenarioSeeded,
} from '../bot-demo-scenario';
import { mockDb } from '../store';
import { botSnapshotSchema, type BotSnapshot } from './bot-schema';

export function captureBotSnapshot(): BotSnapshot {
  const db = mockDb();
  const state = botState();
  return botSnapshotSchema.parse({
    personas: db.personas,
    scripts: db.scripts,
    settings: db.botSettings,
    log: db.botLog,
    manualSeeded: isManualMockBotScenarioSeeded(),
    state: {
      ...state,
      activityMessages: [...state.activityMessages],
      daily: [...state.daily],
      replyTriggers: [...state.replyTriggers],
      replyAdmissions: [...state.replyAdmissions],
      replyPosted: [...state.replyPosted],
      groupRate: [...state.groupRate],
      scriptLastRunAt: [...state.scriptLastRunAt],
    },
  });
}

export function restoreBotSnapshot(input: unknown): void {
  const data = botSnapshotSchema.parse(input);
  const db = mockDb();
  db.personas = data.personas;
  db.scripts = data.scripts;
  db.botSettings = data.settings;
  db.botLog = data.log;
  const restored: BotState = {
    ...data.state,
    audit: data.state.audit.map(({ actorId, ...row }) => ({
      ...row,
      ...(actorId === undefined ? {} : { actorId }),
    })),
    threads: data.state.threads.map(({ kind, triggerMessageId, replyRoomId, ...thread }) => ({
      ...thread,
      ...(kind === undefined ? {} : { kind }),
      ...(triggerMessageId === undefined ? {} : { triggerMessageId }),
      ...(replyRoomId === undefined ? {} : { replyRoomId }),
    })),
    activityMessages: new Map(data.state.activityMessages),
    daily: new Map(data.state.daily),
    replyTriggers: new Map(data.state.replyTriggers),
    replyAdmissions: new Map(data.state.replyAdmissions),
    replyPosted: new Map(data.state.replyPosted),
    groupRate: new Map(data.state.groupRate),
    scriptLastRunAt: new Map(data.state.scriptLastRunAt),
  };
  Object.assign(botState(), restored);
  restoreManualMockBotScenarioSeeded(data.manualSeeded);
}
