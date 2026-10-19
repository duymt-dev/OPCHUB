import { buildNotifications, DAY_MS, MOCK_NOW } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { APP_SETTINGS, CATEGORIES, MODERATION_KEYWORDS, SMTP_DEFAULT } from '../catalog';
import { requireUserId } from './people';

/**
 * Cài đặt về mặc định (seed bắt buộc chỉ upsert `update: {}` nên không tự quay về): lĩnh vực
 * k1–k14, phân quyền vai trò, app_settings, SMTP (xoá key), từ khoá kiểm duyệt; thông báo của
 * TK demo + TK admin (D-04); nhật ký hoạt động mẫu (LOG_SEED).
 */
/**
 * SEC-R02: seed bắt buộc giữ "Bắt buộc 2FA" BẬT như prototype. Demo TẮT vì TK quản trị demo chưa có
 * TOTP (seed không có DATA_ENC_KEY, V2Q-114) — bật thì mọi TK demo vào phiên thiết lập 2FA (V2Q-117).
 */
const DEMO_SETTINGS = {
  ...APP_SETTINGS,
  security: { ...APP_SETTINGS.security, requireAdmin2fa: false },
};

export async function seedSettings(tx: DbTx): Promise<void> {
  const ids = CATEGORIES.map((c) => c.id);
  await tx.category.deleteMany({ where: { id: { notIn: ids } } });
  await tx.$executeRaw`
    UPDATE categories c SET name = x.name, color = x.color, sort = x.sort, hidden = x.hidden,
      scopes = string_to_array(x.scopes, ','), deleted_at = NULL, updated_at = now()
    FROM unnest(${ids}::text[], ${CATEGORIES.map((c) => c.name)}::text[],
                ${CATEGORIES.map((c) => c.color)}::text[], ${CATEGORIES.map((c) => c.sort)}::int[],
                ${CATEGORIES.map((c) => c.hidden)}::boolean[],
                ${CATEGORIES.map((c) => c.scopes.join(','))}::text[])
      AS x(id, name, color, sort, hidden, scopes)
    WHERE c.id = x.id`;
  await tx.appSetting.deleteMany({});
  await tx.appSetting.createMany({
    data: Object.entries(DEMO_SETTINGS).map(([key, value]) => ({
      key,
      value,
    })),
  });
  await tx.smtpConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...SMTP_DEFAULT },
    update: { ...SMTP_DEFAULT, keyEnc: null },
  });
  await tx.moderationKeyword.deleteMany({});
  const base = Date.UTC(2026, 0, 1);
  await tx.moderationKeyword.createMany({
    data: MODERATION_KEYWORDS.map((word, i) => ({ word, createdAt: new Date(base + i * 1000) })),
  });
}

/** Thông báo s1–s4: hộp thư riêng mỗi TK nên id gắn tiền tố người nhận */
export async function seedNotifications(tx: DbTx): Promise<void> {
  const list = buildNotifications();
  await tx.notification.createMany({
    data: ['m1', 'admin'].flatMap((userId) =>
      list.map((n) => ({
        id: `${userId}-${n.id}`,
        userId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: n.read ? new Date(n.createdAt) : null,
        createdAt: new Date(n.createdAt),
      })),
    ),
  });
}

const HOUR = 3_600_000;
/** LOG_SEED của settings-log mock: [người thao tác, câu hiển thị, nhãn, cách MOCK_NOW] */
const LOG_SEED: [string, string, string, number][] = [
  ['ad1', 'bật đăng nhập bằng DeepSeek', 'sso', 2 * HOUR],
  ['Lê Minh Anh', 'khóa tài khoản Ngô Thành Đạt do vi phạm nội quy', 'member', 5 * HOUR],
  ['ad1', 'thêm Đỗ Hải Yến vào vai trò Điều phối viên', 'permission', DAY_MS + HOUR],
  ['Lê Minh Anh', 'xuất bản dự án SoloBooks', 'project', DAY_MS + 2 * HOUR],
  ['ad1', 'thêm ngôn ngữ ລາວ (Lào)', 'language', 3 * DAY_MS + HOUR],
  [
    'Đỗ Hải Yến',
    'xóa 2 tin nhắn nhạy cảm trong OPC TP. Hồ Chí Minh',
    'moderation',
    4 * DAY_MS + HOUR,
  ],
];

/**
 * `audit_logs` chỉ INSERT (trigger chặn UPDATE/DELETE): chèn theo id cố định `demo-lg<n>`,
 * `ON CONFLICT DO NOTHING` — chạy lại không đổi gì; dòng e2e tạo ra vẫn còn (Q-B62-12).
 */
export async function seedAuditLog(tx: DbTx): Promise<void> {
  const rows = LOG_SEED.map(([who, summary, tag, ago], i) => ({
    id: `demo-lg${i + 1}`,
    actorId: who === 'ad1' ? 'ad1' : requireUserId(who),
    summary,
    tag,
    at: new Date(MOCK_NOW - ago),
  }));
  await tx.$executeRaw`
    INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, tag, summary, created_at)
    SELECT x.id, x.actor_id, 'demo.seed', 'settings', x.id, x.tag, x.summary, x.at
    FROM unnest(${rows.map((r) => r.id)}::text[], ${rows.map((r) => r.actorId)}::text[],
                ${rows.map((r) => r.tag)}::text[], ${rows.map((r) => r.summary)}::text[],
                ${rows.map((r) => r.at)}::timestamptz[]) AS x(id, actor_id, tag, summary, at)
    ON CONFLICT (id) DO NOTHING`;
}
