import { seed } from '../../fixtures';

/**
 * Trạng thái khởi tạo của màn Chat nhóm trong prototype (chatPage, state.unread, OWN, GCOV, D_P).
 * Chép dữ liệu, không chép logic.
 */

/** Người tạo chủ đề seed (TOPIC_SEED[].by) — khóa `<group>:<room>` */
export const TOPIC_AUTHORS: Record<string, string> = {
  'c1:qa': 'Trần Quốc Bảo',
  'c1:docs': 'Vũ Đức Long',
  'c1:events': 'Lê Minh Anh',
  'c2:qa': 'Hoàng Gia Linh',
  'c2:ai': 'Lê Minh Anh',
  'c6:tour': 'Đỗ Hải Yến',
};

/** Chủ nhóm (OWN / OWNR) — D-43: vai trò theo group_id */
export const GROUP_OWNERS: Record<string, string> = { c1: 'm1', c6: 'm1' };

/** Số tin chưa đọc ban đầu của TK demo (state.unread) — khóa `<group>:<room>` */
export const UNREAD_SEED: Record<string, Record<string, number>> = {
  m1: { 'c1:qa': 3, 'c1:events': 1, 'c2:general': 5, 'c6:general': 2, 'c2:qa': 1 },
};

/** Ảnh đại diện theo tên người gửi (PH trong prototype) */
export const SENDER_PHOTOS: Record<string, string> = {
  'Lê Minh Anh': 'women/44',
  'Trần Quốc Bảo': 'men/22',
  'Phạm Thu Hà': 'women/65',
  'Đỗ Hải Yến': 'women/33',
  'Vũ Đức Long': 'men/46',
  'Hoàng Gia Linh': 'men/52',
  'Ngô Thành Đạt': 'men/41',
};

/** Thành viên mẫu cho bảng thông tin (D_P): [tổ chức, nước, ngành, loại, tên, chức danh, ảnh] */
export type PersonSeed = [string, string, string, 'dn' | 'cn', string, string, string];
export const PEOPLE = seed.D_P as PersonSeed[];

/** Tin ảnh trong seed (`img`) — prototype-seed giữ nguyên, DTO cũ bỏ qua */
export const IMAGE_MESSAGES = (() => {
  const out = new Map<string, string>();
  const msgs = seed.MSGS as Record<string, { img?: string }[]>;
  for (const [key, list] of Object.entries(msgs))
    list.forEach((m, i) => {
      if (m.img) out.set(`${key.replace(':', '-')}-${i}`, m.img);
    });
  return out;
})();

export const SYSTEM_SENDER = 'Hệ thống';
