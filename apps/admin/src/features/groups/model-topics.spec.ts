import type { AdminRoom } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import { emptyGroupForm } from './model';
import { dropFromForm, renameInForm } from './model-topics';

const room = (key: string, name: string): AdminRoom => ({
  id: `g1-${key}`,
  key,
  name,
  description: '',
  isDefault: key === 'general',
});

describe('D-111 bản nháp form theo chủ đề vừa đổi tên / xoá', () => {
  const form = {
    ...emptyGroupForm(),
    id: 'g1',
    rooms: ['general' as const, 'qa' as const, 'docs' as const],
    extraRooms: [{ name: 'Thuế', description: 'Hỏi thuế' }],
  };

  it('đổi tên phòng tự đặt → đổi theo; phòng mặc định giữ khoá', () => {
    const next = renameInForm(form, room('thue', 'thuế'), {
      ...room('thue', 'Thuế & kế toán'),
      description: 'Mới',
    });
    expect(next.extraRooms).toEqual([{ name: 'Thuế & kế toán', description: 'Mới' }]);
    expect(renameInForm(form, room('qa', 'Hỏi đáp'), room('qa', 'Hỏi & đáp'))).toBe(form);
  });

  it('xoá → bỏ khỏi roomKeys / extraRooms để "Lưu thay đổi" không tạo lại', () => {
    expect(dropFromForm(form, room('docs', 'Tài liệu')).rooms).toEqual(['general', 'qa']);
    expect(dropFromForm(form, room('thue', 'Thuế')).extraRooms).toEqual([]);
  });
});
