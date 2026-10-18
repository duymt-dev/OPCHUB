import { fieldErrorsFrom, firstErrorKey, focusFirstInvalid, hasErrors } from './field-errors';
import { translateErrors } from './use-field-errors';

describe('fieldErrorsFrom', () => {
  const map = { email: 'email', phone: 'phone', 'business.taxCode': 'tax' } as const;

  it('BUG-022 ánh xạ fields lồng sang khoá ô', () => {
    const out = fieldErrorsFrom(
      [
        { path: 'phone.number', message: 'Số điện thoại không hợp lệ' },
        { path: 'business.taxCode', message: 'MST đã đăng ký' },
        { path: 'email', message: 'Email đã được sử dụng cho tài khoản khác' },
      ],
      map,
    );
    expect(out).toEqual({
      phone: 'Số điện thoại không hợp lệ',
      tax: 'MST đã đăng ký',
      email: 'Email đã được sử dụng cho tài khoản khác',
    });
    expect(firstErrorKey(out)).toBe('phone');
  });

  it('bỏ path không có trong map', () => {
    const out = fieldErrorsFrom(
      [
        { path: 'password', message: 'Mật khẩu yếu' },
        { path: 'business', message: 'x' },
      ],
      map,
    );
    expect(out).toEqual({});
    expect(hasErrors(out)).toBe(false);
  });

  it('không có map → dùng nguyên path; mỗi ô giữ thông điệp đầu tiên', () => {
    const out = fieldErrorsFrom([
      { path: 'title', message: 'a' },
      { path: 'title', message: 'b' },
    ]);
    expect(out).toEqual({ title: 'a' });
  });
});

describe('translateErrors / focusFirstInvalid', () => {
  it('BUG-022 dịch map khoá lỗi, giữ thứ tự ô', () => {
    const out = translateErrors(
      { name: 'needName', groups: 'needGroup' } as const,
      (e) => `t:${e}`,
    );
    expect(Object.keys(out)).toEqual(['name', 'groups']);
    expect(out.groups).toBe('t:needGroup');
  });

  it('BUG-022 focus ô sai đầu tiên (nhóm → phần tử con đầu tiên)', () => {
    document.body.innerHTML = `
      <input id="a" />
      <div role="radiogroup" aria-invalid="true" aria-describedby="e1"><button id="r1"></button></div>
      <input id="b" aria-invalid="true" aria-describedby="e2" />`;
    expect(focusFirstInvalid(document)?.id).toBe('r1');
    expect(document.activeElement?.id).toBe('r1');
    expect(focusFirstInvalid(document, 'e2')?.id).toBe('b');
  });
});
