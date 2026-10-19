import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { INVESTOR_ADMIN_NAME } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface CommentRow {
  id: string;
  interest_id: string | null;
  from_investor: boolean;
  body: string;
  created_at: Date;
  author_name: string | null;
  /** Tác giả là TK quản trị (`admin_users`, D-52) */
  by_admin: boolean;
}

export interface NewComment {
  investorKey: string;
  interestId: string | null;
  authorId: string;
  fromInvestor: boolean;
  body: string;
}

/**
 * Người gửi (IV-R02): NĐT → họ tên NĐT; Admin (TK quản trị hoặc không còn tác giả) → "Admin OPC Hub";
 * tác giả khác (tin cũ của chủ dự án đã chuyển từ `investor_thread_messages`) → họ tên tác giả.
 */
export function senderOf(r: CommentRow, investorName: string): string {
  if (r.from_investor) return investorName;
  if (r.by_admin || !r.author_name) return INVESTOR_ADMIN_NAME;
  return r.author_name;
}

/** `investor_comments` — MỘT luồng trao đổi NĐT ↔ OPC Hub theo `investor_key` (BUG-006, QT-10) */
@Injectable()
export class InvestorCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Toàn bộ luồng, cũ → mới — Index Scan `(investor_key, created_at)`, 1 query kèm tên tác giả */
  list(investorKey: string): Promise<CommentRow[]> {
    return this.prisma.db.$queryRaw<CommentRow[]>`
      SELECT c.id, c.interest_id, c.from_investor, c.body, c.created_at,
             u.full_name AS author_name, (a.id IS NOT NULL) AS by_admin
      FROM investor_comments c
      LEFT JOIN users u ON u.id = c.author_id AND u.deleted_at IS NULL
      LEFT JOIN admin_users a ON a.id = c.author_id
      WHERE c.investor_key = ${investorKey}
      ORDER BY c.created_at, c.id`;
  }

  add(tx: DbTx, c: NewComment) {
    return tx.investorComment.create({ data: c, select: { id: true, createdAt: true } });
  }
}
