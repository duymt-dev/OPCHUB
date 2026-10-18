/**
 * Kiểm 1 — Outbox → consumer. Mỗi loại sự kiện trong `packages/shared/src/outbox/events.ts`
 * phải có `relay.register('<type>', …)` trong process worker và có ít nhất một chỗ phát (`outbox.add|addMany`).
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c1-outbox.audit.ts
 */
import {
  abs,
  at,
  type CheckResult,
  type Finding,
  grep,
  isMain,
  isProdTs,
  lines,
  printResult,
  rel,
  walk,
} from './lib.audit';

/** Hậu quả nghiệp vụ khi thiếu consumer — tra theo D-xx / comment nơi phát */
const IMPACT: Record<string, { what: string; sev: string }> = {
  'user.locked': {
    what: 'D-15: khoá TK phải ẩn dự án + chuyển nhóm làm chủ về Admin — không có handler nào làm việc này',
    sev: 'S2',
  },
  'user.session_revoked': {
    what: 'không ai publish `session.revoked` lên kênh socket:user → socket đang mở của TK bị khoá/đổi mật khẩu KHÔNG bị ngắt (handshake chỉ kiểm lúc kết nối)',
    sev: 'S2',
  },
  'user.role_changed': {
    what: 'đổi/thu hồi vai trò không ngắt phiên realtime (comment admin-accounts.service hứa "ngắt phiên realtime")',
    sev: 'S3',
  },
};

export function runC1(): CheckResult {
  const eventsFile = abs('packages/shared/src/outbox/events.ts');
  const types: { type: string; line: number }[] = [];
  lines(eventsFile).forEach((l, i) => {
    const m = l.match(/^\s*'([a-z_]+\.[a-z_]+)':\s*/);
    if (m?.[1]) types.push({ type: m[1], line: i + 1 });
  });

  const server = walk('apps/server/src', isProdTs);
  const registers = grep(server, /\.register\(\s*'([a-z_]+\.[a-z_]+)'/);
  // `outbox.add(tx, 'x'` có thể xuống dòng → gom theo file
  const emits: { type: string; where: string }[] = [];
  for (const f of server) {
    const ls = lines(f);
    ls.forEach((l, i) => {
      if (!/outbox\.add(Many)?\(/.test(l) || /^\s*(\*|\/\/)/.test(l)) return;
      const win = ls.slice(i, i + 4).join(' ');
      const m = win.match(/outbox\.add(?:Many)?\(\s*\w+\s*,\s*'([a-z_]+\.[a-z_]+)'/);
      if (m?.[1]) emits.push({ type: m[1], where: `${rel(f)}:${i + 1}` });
    });
  }

  const fail: Finding[] = [];
  const notes: string[] = [];
  let pass = 0;
  const known = new Set(types.map((t) => t.type));

  for (const t of types) {
    const cons = registers.filter((r) => r.m[1] === t.type);
    const em = emits.filter((e) => e.type === t.type);
    const consStr = cons.length ? cons.map(at).join(', ') : 'KHÔNG CÓ';
    const emStr = em.length ? em.map((e) => e.where).join(', ') : 'không nơi nào phát';
    notes.push(`${t.type}: consumer = ${consStr}; phát tại = ${emStr}`);
    if (!cons.length && em.length) {
      const imp = IMPACT[t.type] ?? {
        what: 'sự kiện được ghi nhưng relay bỏ qua (warn)',
        sev: 'S2',
      };
      fail.push({
        where: `packages/shared/src/outbox/events.ts:${t.line} (phát: ${em.map((e) => e.where).join(', ')})`,
        what: `\`${t.type}\` không có consumer — ${imp.what}`,
        sev: imp.sev,
      });
    } else if (!em.length) {
      fail.push({
        where: `packages/shared/src/outbox/events.ts:${t.line}`,
        what: `\`${t.type}\` khai báo nhưng không nơi nào phát`,
        sev: 'NỢ',
      });
    } else pass++;
  }
  for (const e of emits.filter((x) => !known.has(x.type))) {
    fail.push({
      where: e.where,
      what: `phát loại lạ \`${e.type}\` không có trong outboxEvents`,
      sev: 'S2',
    });
  }
  for (const r of registers.filter((x) => !known.has(x.m[1] ?? ''))) {
    fail.push({ where: at(r), what: `register loại lạ \`${r.m[1] ?? ''}\``, sev: 'S4' });
  }

  // Socket: `session.revoked` có ai publish không (user-events.subscriber ngắt socket khi nhận)
  const pubRevoked = grep(server, /publish\([^)]*'session\.revoked'/);
  notes.push(
    `publish 'session.revoked' lên socket:user: ${pubRevoked.length ? pubRevoked.map(at).join(', ') : 'KHÔNG CÓ (subscriber chờ sự kiện không bao giờ tới)'}`,
  );
  // Relay bỏ qua loại chưa có handler (đánh dấu dispatched) → mất sự kiện vĩnh viễn
  const skip = grep(
    [abs('apps/server/src/common/outbox/outbox-relay.service.ts')],
    /chưa có handler/,
  );
  if (skip[0]) {
    notes.push(
      `${at(skip[0])}: relay đánh dấu dispatched cho loại chưa có handler → khi thêm consumer sau, sự kiện cũ KHÔNG được xử lý lại`,
    );
  }

  return { id: 1, title: 'Outbox → consumer', pass, fail, notes };
}

if (isMain('c1-outbox.audit.ts')) printResult(runC1());
