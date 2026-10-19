import {
  INVESTOR_ADMIN_NAME,
  type InvestorInterest,
  type InvestorThread,
  type InvestorThreadMessage,
} from '../../api-domains';
import { members } from '../../fixtures';
import { nameOfUser } from './project-store';
import { mockDb, type MockDb } from './store';
import { iso, notFound, ok, type MockResult } from './util';

/**
 * MSW: MỘT luồng trao đổi theo nhà đầu tư (TIP-V2-107, BUG-006) — Admin "Nhà đầu tư" và Portal
 * "Trao đổi với OPC Hub" cùng đọc/ghi kho này (như bảng `investor_comments`). Khoá = tên NĐT
 * (MSW không có user id cho NĐT ngoài 8 thành viên; server gom theo `user_id`).
 */
export interface ThreadComment {
  id: string;
  investorName: string;
  interestId: string | null;
  fromInvestor: boolean;
  body: string;
  createdAt: string;
}

/** Bình luận mẫu của prototype (16/10/2026 09:00 giờ VN − ago) */
const T0 = Date.UTC(2026, 9, 16, 2, 0);
const SEED: ThreadComment[] = [
  {
    id: 'ivc-seed-0',
    investorName: 'Nguyễn Hoàng Nam',
    interestId: null,
    fromInvestor: true,
    body: 'Chào OPC Hub, quỹ muốn nhận pitch deck và báo cáo tài chính 6 tháng gần nhất của SoloBooks.',
    createdAt: iso(T0 - 1500e5),
  },
  {
    id: 'ivc-seed-1',
    investorName: 'Nguyễn Hoàng Nam',
    interestId: null,
    fromInvestor: false,
    body: 'Chào anh Nam, bên em đã chuyển yêu cầu tới chủ dự án. Dự kiến gửi tài liệu trước thứ Sáu.',
    createdAt: iso(T0 - 1400e5),
  },
];

const stores = new WeakMap<MockDb, ThreadComment[]>();

export function threadStore(): ThreadComment[] {
  const db = mockDb();
  let s = stores.get(db);
  if (!s) {
    s = SEED.map((c) => ({ ...c }));
    stores.set(db, s);
  }
  return s;
}

export const commentsOf = (investorName: string) =>
  threadStore().filter((c) => c.investorName === investorName);

export const interestsOf = (investorName: string): InvestorInterest[] =>
  mockDb().interests.filter((i) => i.investorName === investorName);

/** Id ngẫu nhiên: Portal và Admin MSW cùng ghi vào một luồng (cầu cookie) — không được trùng */
export function pushComment(c: Omit<ThreadComment, 'id'> & { id?: string }): ThreadComment {
  const row: ThreadComment = { ...c, id: c.id ?? `ivc-${crypto.randomUUID().slice(0, 8)}` };
  threadStore().push(row);
  return row;
}

export const INVESTOR_REPLIED_TITLE = 'OPC Hub đã phản hồi quan tâm đầu tư của bạn';

/** IV-R01: mỗi tin Admin → thông báo `invest` cho NĐT (nếu NĐT có TK trong mock), mở dự án đầu tiên */
export function notifyInvestorReplied(c: ThreadComment): void {
  const userId = members.find((m) => m.name === c.investorName)?.id;
  const first = interestsOf(c.investorName)[0];
  if (!userId || !first) return;
  const db = mockDb();
  db.notifications.set(userId, [
    {
      id: `nt-iv-${c.id}`,
      type: 'invest',
      title: INVESTOR_REPLIED_TITLE,
      body: c.body.slice(0, 90),
      link: `/projects/${first.projectId}`,
      read: false,
      createdAt: c.createdAt,
    },
    ...(db.notifications.get(userId) ?? []),
  ]);
}

/**
 * Portal `GET /me/investor-thread`: một phần tử cho người gọi (nếu đã quan tâm) — khoá = quan tâm
 * đầu tiên (như khoá Admin), tin = cả luồng. Chủ dự án không có luồng (V2Q-62).
 */
export function myThreads(userId: string): InvestorThread[] {
  const name = nameOfUser(userId);
  const first = interestsOf(name)[0];
  if (!first) return [];
  return [
    {
      key: first.id,
      projectId: first.projectId,
      projectName: first.projectName,
      counterpartName: INVESTOR_ADMIN_NAME,
      messages: commentsOf(name).map((c) => ({
        id: c.id,
        threadKey: first.id,
        senderName: c.fromInvestor ? name : INVESTOR_ADMIN_NAME,
        fromInvestor: c.fromInvestor,
        body: c.body,
        createdAt: c.createdAt,
      })),
    },
  ];
}

/** NĐT trả lời: `key` = bất kỳ quan tâm nào CỦA người gọi; người khác (kể cả chủ dự án) → 404 */
export function postThreadMessage(
  userId: string,
  key: string,
  body: string,
): MockResult<InvestorThreadMessage> {
  const name = nameOfUser(userId);
  const own = interestsOf(name).find((i) => i.id === key);
  if (!own) return notFound('Không tìm thấy cuộc trao đổi');
  const c = pushComment({
    investorName: name,
    interestId: own.id,
    fromInvestor: true,
    body,
    createdAt: iso(Date.now()),
  });
  return ok({
    id: c.id,
    threadKey: key,
    senderName: name,
    fromInvestor: true,
    body,
    createdAt: c.createdAt,
  });
}
