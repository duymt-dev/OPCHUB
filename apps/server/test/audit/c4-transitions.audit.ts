/**
 * Kiểm 4 — Transition §8 → endpoint + test. Mỗi cạnh của máy trạng thái SRS §8 khai báo "mỏ neo":
 * code thực hiện (regex trong file server), endpoint (method + path, đối chiếu route controller thật),
 * test hợp lệ và test bị chặn (regex trong *.int.spec.ts). Script xác minh từng mỏ neo còn tồn tại
 * (in file:line) — mỏ neo không khớp = THIẾU. Chạy lại được khi code đổi.
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/c4-transitions.audit.ts
 */
import {
  abs,
  type CheckResult,
  controllerRoutes,
  type Finding,
  isMain,
  lines,
  printResult,
  type Route,
} from './lib.audit';
import { withAffiliateTransitions } from './c4-affiliate/index.audit';

interface Anchor {
  file: string;
  re: RegExp;
}
interface Edge {
  machine: string;
  edge: string;
  impl: Anchor | null;
  /** 'JOB' = không qua HTTP (scheduler/worker) */
  endpoints: string[] | 'JOB';
  ok: Anchor | null;
  blocked: Anchor | null;
  /** mức nếu thiếu test hợp lệ */
  sevNoTest?: string;
  note?: string;
}

const S = 'apps/server/src/modules';
const T = 'apps/server/test';

const EDGES: Edge[] = [
  // ---- Tài khoản
  {
    machine: 'Tài khoản',
    edge: 'Hoạt động → Đã khóa',
    impl: {
      file: `${S}/account/repositories/admin-users.repository.ts`,
      re: /AND status = \$\{from\}::user_status/,
    },
    endpoints: [
      'PATCH /v1/admin/users/:id/status',
      'POST /v1/admin/users/status',
      'POST /v1/admin/reports/:id/action',
    ],
    ok: { file: `${T}/account/admin-users.int.spec.ts`, re: /khoá → token cũ 403/ },
    blocked: { file: `${T}/account/admin-users.int.spec.ts`, re: /Khoá lần 2 → 409/ },
  },
  {
    machine: 'Tài khoản',
    edge: 'Đã khóa → Hoạt động',
    impl: {
      file: `${S}/account/repositories/admin-users.repository.ts`,
      re: /status === 'locked' \? 'active' : 'locked'/,
    },
    endpoints: ['PATCH /v1/admin/users/:id/status', 'POST /v1/admin/users/status'],
    ok: { file: `${T}/account/admin-users.int.spec.ts`, re: /mở khoá lại đăng nhập được/ },
    blocked: null,
  },
  // ---- Phí
  {
    machine: 'Phí',
    edge: 'Chờ TT → Đang hiệu lực',
    impl: {
      file: `${S}/membership-fee/services/membership-fee.service.ts`,
      re: /canTransition\(cur\.status, 'active'\)/,
    },
    endpoints: [
      'POST /v1/webhooks/bank',
      'POST /v1/admin/fees/:uid/:action',
      'POST /v1/admin/fees/collect',
      'POST /v1/admin/fees/transactions/:id/match',
    ],
    ok: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /đủ tiền → active/ },
    blocked: { file: `${T}/membership-fee/admin-fees.int.spec.ts`, re: /khớp lần 2 → 409/ },
    note: 'TRANSITIONS: mọi trạng thái đều → active nên nhánh conflict của canTransition không bao giờ chạy',
  },
  {
    machine: 'Phí',
    edge: 'Đang hiệu lực → Sắp hết hạn',
    impl: {
      file: `${S}/membership-fee/repositories/membership-fee.repository.ts`,
      re: /SET status = 'expiring'/,
    },
    endpoints: 'JOB',
    ok: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /còn 20 ngày → expiring/ },
    blocked: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /chạy 2 lần không đổi thêm/ },
  },
  {
    machine: 'Phí',
    edge: 'Sắp hết hạn → Hết hạn',
    impl: {
      file: `${S}/membership-fee/repositories/membership-fee.repository.ts`,
      re: /SET status = 'expired'/,
    },
    endpoints: 'JOB',
    ok: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /quá hạn → expired/ },
    blocked: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /chạy 2 lần không đổi thêm/ },
  },
  {
    machine: 'Phí',
    edge: 'Hết hạn → Gia hạn → Đang hiệu lực',
    impl: {
      file: `${S}/membership-fee/domain/membership-fee.state.ts`,
      re: /expired: \['active'\]/,
    },
    endpoints: [
      'POST /v1/webhooks/bank',
      'POST /v1/admin/fees/:uid/:action',
      'POST /v1/admin/fees/collect',
    ],
    ok: {
      file: `${T}/membership-fee/admin-fees.int.spec.ts`,
      re: /createUser\(t, \{ fee: 'expired' \}\)/,
    },
    blocked: null,
    note: "action 'renew' (FEE_ACTIONS) không có test nào gọi",
  },
  {
    machine: 'Phí',
    edge: 'Đang hiệu lực → Gia hạn (nối tiếp)',
    impl: {
      file: `${S}/membership-fee/domain/membership-fee.state.ts`,
      re: /active: \['active', 'expiring'\]/,
    },
    endpoints: ['POST /v1/webhooks/bank'],
    ok: { file: `${T}/membership-fee/reconcile.int.spec.ts`, re: /nối tiếp từ ngày hết hạn/ },
    blocked: null,
  },
  // ---- Thành viên nhóm (D-71: vào ngay, không còn chờ duyệt)
  {
    machine: 'Thành viên nhóm',
    edge: 'Chưa tham gia / Đã rời → Thành viên',
    impl: {
      file: `${S}/community/repositories/group.repository.ts`,
      re: /create: \{ groupId, userId, status: 'member', intro \}/,
    },
    endpoints: ['POST /v1/groups/:id/join'],
    ok: { file: `${T}/community/groups.int.spec.ts`, re: /join → member \+1/ },
    blocked: { file: `${T}/community/groups.int.spec.ts`, re: /join lại → 409/ },
  },
  {
    machine: 'Thành viên nhóm',
    edge: 'Thành viên → Đã rời',
    impl: {
      file: `${S}/community/services/group.service.ts`,
      re: /transition\(tx, groupId, userId, 'member', 'left'\)/,
    },
    endpoints: ['DELETE /v1/groups/:id/join'],
    ok: { file: `${T}/community/groups.int.spec.ts`, re: /rời → left −1/ },
    blocked: null,
  },
  // ---- Dự án
  {
    machine: 'Dự án',
    edge: 'Nháp → Chờ duyệt',
    impl: {
      file: `${S}/project/services/project-write.service.ts`,
      re: /input\.submit \? 'pending_review' : 'draft'/,
    },
    endpoints: ['POST /v1/projects', 'PATCH /v1/projects/:id'],
    ok: { file: `${T}/project/projects.int.spec.ts`, re: /submit → Chờ duyệt/ },
    blocked: { file: `${T}/project/projects.int.spec.ts`, re: /Đã ẩn → 409/ },
  },
  {
    machine: 'Dự án',
    edge: 'Chờ duyệt → Đang hiển thị',
    impl: {
      file: `${S}/project/domain/project-status.ts`,
      re: /approve: \{ from: 'pending_review', to: 'published' \}/,
    },
    endpoints: ['POST /v1/admin/projects/:id/review', 'POST /v1/admin/projects/bulk'],
    ok: { file: `${T}/project/admin-projects.int.spec.ts`, re: /approve → published/ },
    blocked: { file: `${T}/project/admin-projects.int.spec.ts`, re: /duyệt lại → 409/ },
  },
  {
    machine: 'Dự án',
    edge: 'Đang hiển thị → Đã ẩn',
    impl: {
      file: `${S}/project/domain/project-status.ts`,
      re: /hide: \{ from: 'published', to: 'hidden' \}/,
    },
    endpoints: ['POST /v1/admin/projects/:id/review', 'POST /v1/admin/projects/bulk'],
    ok: { file: `${T}/project/admin-projects.int.spec.ts`, re: /review\(p\.id, 'hide'\)/ },
    blocked: null,
  },
  {
    machine: 'Dự án',
    edge: 'Đã ẩn → Đang hiển thị',
    impl: {
      file: `${S}/project/domain/project-status.ts`,
      re: /republish: \{ from: 'hidden', to: 'published' \}/,
    },
    endpoints: ['POST /v1/admin/projects/:id/review', 'POST /v1/admin/projects/bulk'],
    ok: { file: `${T}/project/admin-projects.int.spec.ts`, re: /'republish'/ },
    blocked: null,
  },
  {
    machine: 'Dự án',
    edge: 'Chờ duyệt → Cần chỉnh sửa',
    impl: {
      file: `${S}/project/domain/project-status.ts`,
      re: /request_changes: \{ from: 'pending_review', to: 'needs_changes' \}/,
    },
    endpoints: ['POST /v1/admin/projects/:id/review'],
    ok: { file: `${T}/project/admin-projects.int.spec.ts`, re: /'request_changes'/ },
    blocked: null,
  },
  {
    machine: 'Dự án',
    edge: 'Cần chỉnh sửa → Chờ duyệt',
    impl: { file: `${S}/project/domain/project-status.ts`, re: /'needs_changes',/ },
    endpoints: ['PATCH /v1/projects/:id'],
    ok: { file: `${T}/project/admin-projects.int.spec.ts`, re: /gửi lại cùng bản/ },
    blocked: { file: `${T}/project/projects.int.spec.ts`, re: /Bị từ chối → 409/ },
  },
  {
    machine: 'Dự án',
    edge: 'Chờ duyệt → Bị từ chối',
    impl: {
      file: `${S}/project/domain/project-status.ts`,
      re: /reject: \{ from: 'pending_review', to: 'rejected' \}/,
    },
    endpoints: ['POST /v1/admin/projects/:id/review'],
    ok: {
      file: `${T}/project/admin-projects.int.spec.ts`,
      re: /review\(q\.id, 'reject', 'Spam'\)/,
    },
    blocked: { file: `${T}/project/admin-projects.int.spec.ts`, re: /từ chối thiếu ghi chú → 400/ },
  },
  // ---- Báo cáo tin
  {
    machine: 'Báo cáo tin',
    edge: 'Mới → Đã xử lý (bỏ qua/ẩn/cảnh báo/khóa)',
    impl: {
      file: `${S}/moderation/repositories/report.repository.ts`,
      re: /where: \{ id, status: 'open' \}/,
    },
    endpoints: ['POST /v1/admin/reports/:id/action'],
    ok: { file: `${T}/moderation/moderation.int.spec.ts`, re: /admin hide: .*ca resolved/ },
    blocked: { file: `${T}/moderation/moderation.int.spec.ts`, re: /xử lý lần 2 → 409/ },
  },
  // ---- Đăng ký sự kiện
  {
    machine: 'Đăng ký sự kiện',
    edge: 'Đã đăng ký → Đã tham dự',
    impl: {
      file: `${S}/event/repositories/event.repository.ts`,
      re: /registrationEdge\('registered', 'attended'\)/,
    },
    endpoints: ['POST /v1/admin/events/:id/registrations/check-in'],
    ok: { file: `${T}/event/admin-events.int.spec.ts`, re: /check-in một \/ tất cả/ },
    blocked: { file: `${T}/event/admin-events.int.spec.ts`, re: /cancelled → attended bị bỏ qua/ },
    note: 'id đã huỷ bị bỏ qua (BUG-041, theo lô), không 409',
  },
  {
    machine: 'Đăng ký sự kiện',
    edge: 'Đã đăng ký → Đã hủy',
    impl: {
      file: `${S}/event/repositories/event.repository.ts`,
      re: /registrationEdge\('registered', 'cancelled'\)/,
    },
    endpoints: ['DELETE /v1/events/:id/registration'],
    ok: { file: `${T}/event/events.int.spec.ts`, re: /huỷ → -1/ },
    blocked: { file: `${T}/event/events.int.spec.ts`, re: /attended → cancelled bị chặn/ },
  },
  // ---- Phiếu YC: D-72 (V4-605) bỏ quy trình 5 bước — phiếu + ghi chú nội bộ
  // ---- Quan tâm đầu tư: D-72 (V4-604) bỏ máy trạng thái — chỉ còn danh sách
  // ---- Hội thoại bot
  {
    machine: 'Hội thoại bot',
    edge: 'Chờ lịch → Đang chạy → Hoàn tất (server: pending → posted)',
    impl: {
      file: `${S}/bot/services/bot-thread.service.ts`,
      re: /where: \{ id, status: 'pending' \}/,
    },
    endpoints: ['POST /v1/admin/bot/threads/:id/approve'],
    ok: { file: `${T}/bot/bot.int.spec.ts`, re: /run → pending; duyệt/ },
    blocked: { file: `${T}/bot/bot.int.spec.ts`, re: /duyệt lại 409/ },
    note: 'server chỉ có pending/posted, đăng tất cả dòng một lần khi Admin duyệt; không có trạng thái "Đang chạy", không job chạy theo runAt/delayMinutes',
  },
];

/** Cạnh ngoài §8 mà server cho phép — xác minh bằng mỏ neo */
const EXTRA: { where: Anchor; what: string; sev: string }[] = [
  {
    // BUG-033: mỏ neo cũ khớp dòng `'rejected',` trong OWNER_EDITABLE; nay khớp hàm ownerSaveStatus
    // còn trả trạng thái cho `rejected` (tái phát) — không còn khớp `PROJECT_STATUSES`
    where: { file: `${S}/project/domain/project-status.ts`, re: /case 'rejected':/ },
    what: "OWNER_EDITABLE gồm 'rejected' và 'published': chủ dự án lưu lại → Bị từ chối → Chờ duyệt/Nháp, Đang hiển thị → Nháp (lưu nháp) — §8 không có cạnh này",
    sev: 'S3',
  },
  {
    where: {
      file: `${S}/event/repositories/event.repository.ts`,
      re: /data: \{ status: 'registered', checkedInAt: null, createdAt/,
    },
    what: 'Đã hủy → Đã đăng ký (đăng ký lại) và Đã tham dự → Đã đăng ký (bỏ check-in) — ngoài §8',
    sev: 'S4',
  },
];

function find(a: Anchor): string | null {
  const ls = lines(abs(a.file));
  const i = ls.findIndex((l) => a.re.test(l));
  return i < 0 ? null : `${a.file}:${i + 1}`;
}

function epFound(routes: readonly Route[], ep: string): boolean {
  const [method, path] = ep.split(' ');
  return routes.some((r) => r.method === method && r.path === path);
}

export function runC4(): CheckResult {
  const routes = controllerRoutes();
  const fail: Finding[] = [];
  const notes: string[] = [
    '| Máy | Cạnh | Code | Endpoint | Test hợp lệ | Test bị chặn |',
    '|---|---|---|---|---|---|',
  ];
  let pass = 0;
  for (const e of EDGES) {
    const impl = e.impl ? find(e.impl) : null;
    const eps =
      e.endpoints === 'JOB'
        ? 'job worker (fee.sweep)'
        : e.endpoints.map((x) => (epFound(routes, x) ? x : `${x} (KHÔNG THẤY)`)).join('<br>');
    const epMissing = e.endpoints !== 'JOB' && e.endpoints.every((x) => !epFound(routes, x));
    const ok = e.ok ? find(e.ok) : null;
    const bl = e.blocked ? find(e.blocked) : null;
    notes.push(
      `| ${e.machine} | ${e.edge} | ${impl ?? 'THIẾU'} | ${eps} | ${ok ?? 'THIẾU'} | ${bl ?? 'THIẾU'}${e.note ? ` — ${e.note}` : ''} |`,
    );
    const label = `${e.machine}: ${e.edge}`;
    if (!impl)
      fail.push({
        where: e.impl?.file ?? '—',
        what: `${label} — không thấy code transition`,
        sev: 'S2',
      });
    if (epMissing)
      fail.push({ where: impl ?? '—', what: `${label} — không endpoint nào gọi`, sev: 'S2' });
    if (!ok) {
      fail.push({
        where: impl ?? '—',
        what: `${label} — không có test int/contract cho cạnh hợp lệ`,
        sev: e.sevNoTest ?? 'NỢ',
      });
    }
    if (impl && !epMissing && ok) pass++;
    if (e.note && /luật 7|không có trạng thái/.test(e.note) && impl) {
      fail.push({
        where: impl,
        what: `${label} — ${e.note}`,
        sev: /luật 7/.test(e.note) ? 'S2' : 'S3',
      });
    }
  }
  const noBlocked = EDGES.filter((e) => !(e.blocked && find(e.blocked))).length;
  notes.push(`Cạnh không có test "bị chặn" (409/404): ${noBlocked}/${EDGES.length}`);
  for (const x of EXTRA) {
    const w = find(x.where);
    if (w) fail.push({ where: w, what: x.what, sev: x.sev });
  }
  return withAffiliateTransitions(
    { id: 4, title: 'Transition §8 → endpoint + test', pass, fail, notes },
    routes,
  );
}

if (isMain('c4-transitions.audit.ts')) printResult(runC4());
