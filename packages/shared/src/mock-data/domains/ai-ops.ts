import {
  aiCallsPageSchema,
  encodeAiCallsCursor,
  auditCsvTimestamp,
  type AiCallItem,
  type AiCallsFilter,
  type AiCallsQuery,
} from '../../api-domains';
import { mockDb } from './store';

const storageKey = 'opchub-mock-ai-calls';
function storedRows(): AiCallItem[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const parsed = aiCallsPageSchema.shape.items.safeParse(
      JSON.parse(sessionStorage.getItem(storageKey) ?? '[]'),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
function persistRows(value: AiCallItem[]) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Storage may be disabled; the in-memory mock remains usable.
  }
}
const calls = new WeakMap<ReturnType<typeof mockDb>, AiCallItem[]>();
function rows() {
  const db = mockDb();
  let rows = calls.get(db);
  if (!rows) {
    rows = storedRows();
    calls.set(db, rows);
  }
  return rows;
}
export function mockAiCall(
  actorId: string,
  realm: 'admin' | 'member',
  metadata?: Pick<AiCallItem, 'provider' | 'model'>,
) {
  const row: AiCallItem = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    purpose: 'content',
    provider: metadata?.provider ?? 'custom',
    model: metadata?.model ?? 'stub-model',
    promptTokens: 42,
    completionTokens: 20,
    cost: 0,
    latencyMs: 5,
    status: 'ok',
    errorCode: null,
    actor: { realm, id: actorId.slice(0, 8) },
  };
  const current = rows();
  current.push(row);
  persistRows(current);
}
const filtered = (q: AiCallsFilter) =>
  rows()
    .filter(
      (r) =>
        Date.parse(r.at) >= Date.parse(q.from) &&
        Date.parse(r.at) <= Date.parse(q.to) &&
        (!q.purpose || r.purpose === q.purpose) &&
        (!q.provider || r.provider === q.provider) &&
        (!q.status || r.status === q.status),
    )
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
export function mockAiCallsPage(q: AiCallsQuery) {
  const all = filtered(q);
  const page = all.filter(
    (r) => !q.cursor || r.at < q.cursor.at || (r.at === q.cursor.at && r.id < q.cursor.id),
  );
  const items = page.slice(0, q.limit),
    last = items.at(-1);
  return aiCallsPageSchema.parse({
    items,
    nextCursor:
      last && page.length > q.limit ? encodeAiCallsCursor({ at: last.at, id: last.id }) : null,
    totals: {
      calls: all.length,
      cost: all.reduce((n, r) => n + r.cost, 0),
      promptTokens: all.reduce((n, r) => n + r.promptTokens, 0),
      completionTokens: all.reduce((n, r) => n + r.completionTokens, 0),
    },
  });
}
export function mockAiCallsCsv(q: AiCallsFilter) {
  const all = filtered(q);
  const safe = (text: string) => (/^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text);
  const cell = (value: string | number) => `"${safe(String(value)).replaceAll('"', '""')}"`;
  const header =
    'Thời gian,Chức năng,Nhà cung cấp,Mô hình,Token vào,Token ra,Chi phí (đ),Độ trễ (ms),Trạng thái,Mã lỗi';
  const lines = all.map((r) =>
    [
      auditCsvTimestamp(r.at),
      r.purpose,
      r.provider,
      r.model,
      r.promptTokens,
      r.completionTokens,
      r.cost,
      r.latencyMs,
      r.status,
      r.errorCode ?? '',
    ]
      .map(cell)
      .join(','),
  );
  return { rows: all.length, csv: '\ufeff' + [header, ...lines].join('\n') };
}
