import type { AdminProject } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import {
  drawerActions,
  inTab,
  reviewView,
  formatMoney,
  infoRows,
  pageSlice,
  plainText,
  reviewNote,
  tabCounts,
  tabOf,
  vnDate,
  type InfoLabels,
} from './model';
import { parseReviewId, reviewPath } from './route';

const proj = (over: Partial<AdminProject>): AdminProject => ({
  id: 'p7',
  name: 'HalalLink',
  category: 'Marketplace',
  ownerName: 'Rina Sari',
  groupName: 'OPC Hà Nội',
  summary: 'Sàn Halal',
  tone: 'green',
  status: 'pending_review',
  stage: 'mvp',
  country: 'Indonesia',
  tags: ['Halal'],
  website: 'https://halallink.id',
  followers: 0,
  reviewNote: null,
  createdAt: '2026-10-14T17:00:00.000Z',
  team: [],
  funding: null,
  coverUrl: 'x',
  description: 'mô tả',
  testUrl: null,
  repo: { provider: 'github', url: 'https://github.com/h/p', visibility: 'public' },
  visibility: 'public',
  groupNames: ['OPC Hà Nội', 'OPC Đà Nẵng'],
  featured: false,
  revision: null,
  fundraising: null,
  ...over,
});

const L: InfoLabels = {
  stage: { idea: 'Ý tưởng', mvp: 'MVP', growth: 'Tăng trưởng', launched: 'Đã ra mắt' },
  none: '—',
  noRepo: 'Không chia sẻ',
  repoPublic: 'Public',
  repoPrivate: 'Private',
  visPublic: 'Công khai',
  visPrivate: 'Riêng tư',
  noFunding: 'Không',
  funding: (a, e) => `${a} cho ${e}% cổ phần`,
};

describe('model kiểm duyệt dự án', () => {
  it('tab theo trạng thái + đếm', () => {
    expect(tabOf('needs_changes')).toBe('changes');
    const c = tabCounts([proj({}), proj({ id: 'b', status: 'published' })]);
    expect(c).toMatchObject({ pending: 1, live: 1, hidden: 0, draft: 0 });
  });

  it('chỉ hiện thao tác hợp lệ trong drawer', () => {
    expect(drawerActions('pending_review')).toEqual({
      canReview: true,
      canHide: false,
      canRepublish: false,
    });
    expect(drawerActions('published').canHide).toBe(true);
    expect(drawerActions('hidden').canRepublish).toBe(true);
    expect(drawerActions('rejected')).toEqual({
      canReview: false,
      canHide: false,
      canRepublish: false,
    });
  });

  it('REQ-106 bản sửa Chờ duyệt: vào tab Chờ duyệt, drawer hiện nội dung bản sửa, có nút duyệt', () => {
    const rev: NonNullable<AdminProject['revision']> = {
      id: 'r1',
      status: 'pending_review',
      reviewNote: null,
      updatedAt: '2026-10-15T00:00:00.000Z',
      name: 'HalalLink 2',
      category: 'Marketplace',
      summary: 'Mới',
      stage: 'growth',
      tags: ['Mới'],
      website: null,
      coverUrl: 'y',
      description: 'mô tả mới',
      testUrl: null,
      repo: null,
      visibility: 'public',
      team: [],
      funding: null,
    };
    const live = proj({ status: 'published', revision: rev });
    expect(inTab(live, 'pending')).toBe(true);
    expect(inTab(live, 'live')).toBe(true);
    expect(tabCounts([live])).toMatchObject({ pending: 1, live: 1 });
    expect(reviewView(live)).toMatchObject({ name: 'HalalLink 2', status: 'published' });
    expect(drawerActions('published', true)).toMatchObject({ canReview: true, canHide: true });
    const rejected = proj({ status: 'published', revision: { ...rev, status: 'rejected' } });
    expect(inTab(rejected, 'pending')).toBe(false);
    expect(reviewView(rejected).name).toBe('HalalLink');
  });

  it('phân trang kẹp trang', () => {
    expect(pageSlice([1, 2, 3], 5, 2)).toEqual({ page: 2, items: [3] });
  });

  it('định dạng tiền như prototype', () => {
    expect(formatMoney(150_000, 'USD')).toBe('$150K');
    expect(formatMoney(2_000_000_000, 'VND')).toBe('2 tỷ ₫');
    expect(formatMoney(1_500_000_000, 'VND')).toBe('1,5 tỷ ₫');
    expect(formatMoney(300_000_000, 'VND')).toBe('300 triệu ₫');
  });

  it('ghi chú: lý do – lời nhắn văn bản thuần', () => {
    expect(plainText('<p>Bổ sung&nbsp;ảnh</p><p>bìa</p>')).toBe('Bổ sung ảnh bìa');
    expect(reviewNote('Thiếu thông tin mô tả', '<p>thêm số liệu</p>')).toBe(
      'Thiếu thông tin mô tả – thêm số liệu',
    );
    expect(reviewNote('', '<p></p>')).toBe('');
  });

  it('bảng thông tin: ngày giờ VN, repo, đội ngũ rỗng → chủ dự án', () => {
    expect(vnDate('2026-10-14T17:00:00.000Z')).toBe('15/10/2026');
    const rows = Object.fromEntries(infoRows(proj({}), L).map((r) => [r.key, r.value]));
    expect(rows.repo).toBe('GitHub · Public · https://github.com/h/p');
    expect(rows.team).toBe('Rina Sari');
    expect(rows.testUrl).toBe('—');
    expect(rows.groups).toBe('OPC Hà Nội, OPC Đà Nẵng');
    expect(rows.funding).toBe('Không');
  });

  it('đường dẫn drawer', () => {
    expect(parseReviewId('/projects')).toBeNull();
    expect(parseReviewId('/projects/p7/review')).toBe('p7');
    expect(parseReviewId('/projects/p7')).toBeUndefined();
    expect(reviewPath('p7')).toBe('/projects/p7/review');
  });
});
