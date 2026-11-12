import { describe, expect, it } from 'vitest';
import type { GroupMemberRow } from './types';
import { groupExportContent } from './export-content';
import { exportFile } from './model';

const row: GroupMemberRow = {
  groupId: 'c1',
  groupName: 'OPC Hà Nội',
  userId: 'm1',
  fullName: 'Nguyễn Văn An',
  email: 'example@example.test',
  phone: '1',
  accountType: 'business',
  company: 'X',
  taxCode: '',
  groupRole: 'owner',
  country: 'Việt Nam',
  joinedAt: '2026-03-01T17:00:00.000Z',
  status: 'active',
};

describe('D-141 AC824-12 exported content retains its canonical contract', () => {
  it('retains headers, raw names, enum text and VN dates', () => {
    expect(groupExportContent([row], ['group', 'name', 'type', 'grole', 'date'])).toEqual({
      head: ['Nhóm', 'Họ và tên', 'Loại tài khoản', 'Vai trò trong nhóm', 'Ngày tham gia'],
      table: [['OPC Hà Nội', 'Nguyễn Văn An', 'Doanh nghiệp', 'Chủ nhóm', '02/03/2026']],
    });
  });

  it('preserves exact CSV bytes including BOM, escaping and line endings', async () => {
    const { head, table } = groupExportContent(
      [{ ...row, fullName: 'Tên "riêng"' }],
      ['name', 'status'],
    );
    const actual = new Uint8Array(await exportFile(head, table, 'csv').arrayBuffer());
    expect(Array.from(actual)).toEqual(
      Array.from(
        new TextEncoder().encode('\ufeff"Họ và tên","Trạng thái"\r\n"Tên ""riêng""","Hoạt động"'),
      ),
    );
  });

  it('keeps the Excel export in Vietnamese and escapes raw markup', async () => {
    const { head, table } = groupExportContent(
      [{ ...row, company: '<Công ty & đối tác>' }],
      ['company'],
    );
    const actual = await exportFile(head, table, 'xls').text();
    expect(actual).toContain('<th>Công ty / Tổ chức</th>');
    expect(actual).toContain('<td>&lt;Công ty &amp; đối tác></td>');
  });
});
