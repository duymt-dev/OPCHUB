import type { BotBulkError } from '../../../api-domains/bot-bulk';
import {
  normalizeBotBulkLine,
  planBotBulkPersonas,
  validateBotBulkCompletion,
} from '../../../bot/bulk-plan';
import { botState } from '../bot-state';
import { auditMockBulk } from './audit';
import { mockDb } from '../store';
import { conflict, notFound, ok } from '../util';
import { fakeMockBulkCompletion, type MockBulkPrompt } from './fake';
import type { MockBulkRecord } from './schema';
import { mockBulkGroupsExist, mockBulkPersonas, mockBulkRecord, refreshMockBulk } from './state';

type Complete = (prompt: MockBulkPrompt) => unknown;

const existingCache = new WeakMap<MockBulkRecord, Set<string>>();

function existingLinesFor(record: MockBulkRecord): Set<string> {
  let cached = existingCache.get(record);
  if (!cached) {
    cached = new Set([
      ...mockDb().scripts.flatMap((s) => s.lines.map((line) => normalizeBotBulkLine(line.body))),
      ...record.items.flatMap((item) => item.lines.map((line) => normalizeBotBulkLine(line.body))),
    ]);
    existingCache.set(record, cached);
  }
  return cached;
}

/** One persisted cursor per due record per tick; replay cannot create the same ordinal twice. */
export function advanceMockBulk(now = Date.now(), complete: Complete = fakeMockBulkCompletion) {
  const due = botState()
    .bulk.filter((r) => r.value.status === 'running' && r.nextAt !== null && r.nextAt <= now)
    .sort((a, b) => (a.nextAt ?? 0) - (b.nextAt ?? 0) || a.value.id.localeCompare(b.value.id))
    .slice(0, 30);
  for (const record of due) generate(record, now, complete);
}
function generate(record: MockBulkRecord, now: number, complete: Complete) {
  const batch = record.value;
  if (record.attempts >= 3) return fail(record, 'provider', false, now);
  if (!mockBulkGroupsExist(batch.groupIds)) return fail(record, 'groups_missing', false, now);
  const people = planBotBulkPersonas(
    mockBulkPersonas(batch.groupIds),
    batch.groupIds,
    batch.turns,
    batch.cursor,
  );
  if (!people.length) return fail(record, 'personas_missing', false, now);
  const topic = batch.topics[Math.floor(batch.cursor / batch.perTopic)];
  if (!topic) return fail(record, 'invalid_response', false, now);
  record.attempts++;
  let raw: unknown;
  try {
    raw = complete({
      batchId: batch.id,
      topic,
      ordinal: batch.cursor,
      turns: batch.turns,
      attempt: record.attempts,
    });
  } catch {
    return fail(record, 'provider', true, now);
  }
  let bodies: string[];
  try {
    bodies = validateBotBulkCompletion(raw, batch.turns);
  } catch {
    return fail(record, 'invalid_response', true, now);
  }
  const existing = existingLinesFor(record);
  if (bodies.some((body) => existing.has(normalizeBotBulkLine(body))))
    return fail(record, 'duplicate', true, now);
  for (const body of bodies) existing.add(normalizeBotBulkLine(body));
  const item = {
    id: crypto.randomUUID(),
    ordinal: batch.cursor,
    topic,
    selected: true,
    savedScriptId: null,
    lines: people.map((persona, i) => {
      const body = bodies[i];
      if (!body) throw new Error('Validated bulk line is missing');
      return { personaId: persona.id, body };
    }),
  };
  record.items.push(item);
  batch.cursor++;
  batch.status = batch.cursor === batch.total ? 'done' : 'running';
  batch.error = null;
  record.attempts = 0;
  record.nextAt = batch.status === 'done' ? null : now;
  refreshMockBulk(record, now);
  auditMockBulk(
    record.actorId,
    'bot.bulk.item_generated',
    'bot_bulk_item',
    item.id,
    `Tạo kịch bản AI ${topic}`,
  );
}
function fail(record: MockBulkRecord, error: BotBulkError, retryable: boolean, now: number) {
  const retry = retryable && record.attempts < 3;
  record.value.status = retry ? 'running' : 'failed';
  record.value.error = retry ? null : error;
  record.nextAt = retry ? now + (error === 'provider' ? 60_000 : 1000) : null;
  refreshMockBulk(record, now);
  if (!retry)
    auditMockBulk(
      record.actorId,
      'bot.bulk.failed',
      'bot_bulk_batch',
      record.value.id,
      `Đợt tạo kịch bản AI báo lỗi: ${error}`,
    );
}
export function retryMockBulk(id: string, now = Date.now()) {
  const record = mockBulkRecord(id);
  if (!record) return notFound('Không tìm thấy đợt tạo kịch bản');
  if (record.value.status !== 'failed') return conflict('Chỉ thử lại đợt tạo đã báo lỗi');
  record.value.status = 'running';
  record.value.error = null;
  record.attempts = 0;
  record.nextAt = now;
  refreshMockBulk(record, now);
  return ok(structuredClone(record.value));
}
