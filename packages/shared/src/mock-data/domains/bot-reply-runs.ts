import type { BotReplyRun } from '../../api-domains/bot-replies';
import { BOT_REPLY_SCAN_MS, botReplyDelayMs } from '../../bot/reply-timing';
import { botState } from './bot-state';
import { mockDb, nextId } from './store';
import { conflict, notFound, ok, iso, type MockResult } from './util';
import { mockBotScheduleAllows } from './bot-schedule';
import { scanMockReplyCandidates } from './bot-reply-scan';
import { admitMockBotReply } from './bot-reply-admission';
import type { MockReplyRun } from './bot-reply-workflow-schema';

type Result = MockResult<{ run: BotReplyRun | null }>;
const current = () => botState().replies.current;
const allowed = (now: number) =>
  botState().featureEnabled && mockDb().botSettings.enabled && mockBotScheduleAllows(now);
export function currentMockReplyRun() {
  const run = current();
  return run ? structuredClone(run.value) : null;
}

export function scanMockReplyRun(manual = false, now = Date.now()): Result {
  if (!allowed(now))
    return manual ? conflict('Bot đang tạm dừng hoặc ngoài lịch chạy') : ok({ run: null });
  if (!manual && !mockDb().botSettings.replyToMembers) return ok({ run: null });
  const state = botState().replies;
  if (state.current?.value.status === 'running') return ok({ run: currentMockReplyRun() });
  const { control } = state;
  if (!manual && control.lastScanAt && now - Date.parse(control.lastScanAt) < BOT_REPLY_SCAN_MS)
    return ok({ run: null });
  control.lastScanAt = iso(now);
  const assigned = new Set(
    mockDb()
      .personas.filter((row) => row.enabled)
      .flatMap((row) => row.groupIds),
  );
  const group = scanMockReplyCandidates(control.sampleSize).find((row) =>
    assigned.has(row.groupId),
  );
  if (!group) return ok({ run: null });
  state.current = {
    value: {
      id: nextId('reply-run-'),
      groupId: group.groupId,
      groupName: group.groupName,
      status: 'running',
      total: group.pending,
      processed: 0,
      posted: 0,
      manual,
      createdAt: iso(now),
    },
    roomId: group.roomId,
    messageIds: group.messageIds,
    delaySeconds: control.delaySeconds,
    nextAt: now + botReplyDelayMs(control.delaySeconds),
    activeThreadId: null,
  };
  return ok({ run: currentMockReplyRun() });
}

function advance(run: MockReplyRun, posted: boolean, now: number) {
  if (run.value.status !== 'running') return;
  run.value.processed++;
  run.value.posted += posted ? 1 : 0;
  run.activeThreadId = null;
  if (run.value.processed === run.value.total) {
    run.value.status = 'done';
    run.nextAt = null;
  } else run.nextAt = now + botReplyDelayMs(run.delaySeconds);
}

/** Materialize one cursor only. The publication worker rechecks policy and completes it. */
export function materializeMockReplyRun(now: number) {
  const run = current();
  if (
    !run ||
    run.value.status !== 'running' ||
    run.activeThreadId ||
    run.nextAt === null ||
    run.nextAt > now ||
    !allowed(now)
  )
    return;
  const id = run.messageIds[run.value.processed];
  if (!id) throw new Error('Reply run cursor out of bounds');
  const threadId = admitMockBotReply(id, now, () => 0, { manual: true, dueNow: true });
  if (!threadId) {
    if (botState().threads.filter((row) => row.status !== 'done').length >= 30) return;
    advance(run, false, now);
    return;
  }
  run.activeThreadId = threadId;
  run.nextAt = null;
}

export function completeMockReplyThread(threadId: string, posted: boolean, now: number) {
  const run = current();
  if (run?.activeThreadId === threadId) advance(run, posted, now);
}

export function stopMockReplyRun(id: string): Result {
  const run = current();
  if (!run || run.value.id !== id) return notFound('Không tìm thấy lượt trả lời');
  if (run.value.status !== 'running') return conflict('Lượt trả lời đã dừng hoặc hoàn tất');
  const thread = botState().threads.find((row) => row.id === run.activeThreadId);
  if (thread) {
    thread.status = 'done';
    thread.nextAt = null;
  }
  run.value.status = 'stopped';
  run.nextAt = null;
  run.activeThreadId = null;
  return ok({ run: currentMockReplyRun() });
}

export function stopAllMockReplyRuns() {
  const run = current();
  if (run?.value.status === 'running') stopMockReplyRun(run.value.id);
}
