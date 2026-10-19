import { describe, expect, it } from 'vitest';
import { contactLinks, validateContact } from './contact-model';
import { emptyForm, formToSave } from './model';

describe('BUG-016 BUG-021 QT-09 liên hệ công khai của dự án', () => {
  it('chỉ kênh có dữ liệu thành nút; Zalo/Gọi bỏ ký tự phụ', () => {
    const l = contactLinks({ email: 'lienhe@du-an.vn', phone: '+84 912 345 678' });
    expect(l.email?.href).toBe('mailto:lienhe@du-an.vn');
    expect(l.zalo?.href).toBe('https://zalo.me/84912345678');
    expect(l.call?.href).toBe('tel:+84912345678');
    expect(contactLinks({ email: null, phone: '0912345678' }).call?.label).toBe('0912 345 678');
    expect(contactLinks({ email: null, phone: null })).toEqual({
      email: null,
      zalo: null,
      call: null,
    });
  });

  it('kiểm định dạng; rỗng hợp lệ (không công khai) và gửi chuỗi rỗng', () => {
    const f = emptyForm('An', { email: 'an@x.vn', phone: '0912 345 678' });
    expect(validateContact(f)).toEqual({});
    expect(validateContact({ ...f, contactEmail: 'x', contactPhone: 'abc' })).toEqual({
      contactEmail: 'badContactEmail',
      contactPhone: 'badContactPhone',
    });
    const cleared = { ...f, contactEmail: ' ', contactPhone: '' };
    expect(validateContact(cleared)).toEqual({});
    expect(formToSave(cleared, false)).toMatchObject({ contactEmail: '', contactPhone: '' });
  });
});
