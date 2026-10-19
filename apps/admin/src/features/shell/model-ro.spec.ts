import { describe, expect, it } from 'vitest';
import { isWriteClick, type RoTarget } from './model-ro';

const btn = (text: string, o: Partial<RoTarget> = {}): RoTarget => ({
  tag: 'BUTTON',
  text,
  title: '',
  roOk: false,
  act: false,
  pointer: true,
  ...o,
});

describe('RB-R07 chặn nút thao tác trong chế độ chỉ xem', () => {
  it('chặn nút ghi theo nhãn prototype', () => {
    for (const l of [
      'Khóa',
      'Xuất Excel',
      '+ Thêm thành viên',
      'Lưu thay đổi',
      'Duyệt',
      'Gán nhóm',
    ]) {
      expect(isWriteClick([btn(l)]), l).toBe(true);
    }
  });
  it('cho qua xem, đóng, tìm kiếm, phân trang và data-ro-ok', () => {
    for (const l of ['Xem hồ sơ', 'Đóng', '›', 'Tìm', '2'])
      expect(isWriteClick([btn(l)]), l).toBe(false);
    expect(isWriteClick([btn('Khóa', { roOk: true })])).toBe(false);
    expect(isWriteClick([btn('Thoát xem thử'), btn('', { roOk: true, tag: 'DIV' })])).toBe(false);
  });
  it('select / checkbox / data-act luôn là thao tác', () => {
    expect(isWriteClick([btn('', { tag: 'SELECT', act: true, pointer: false })])).toBe(true);
  });
  it('icon nút theo title', () => {
    expect(isWriteClick([btn('', { title: 'Xóa' })])).toBe(true);
  });
});
