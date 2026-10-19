import { hasText, requestActions, steps } from './model';

describe('requests model', () => {
  it('step bar sáng tới trạng thái hiện tại, Từ chối tắt hết', () => {
    expect(steps('quoted').map((s) => s.on)).toEqual([true, true, true, false]);
    expect(steps('lost').some((s) => s.on)).toBe(false);
  });

  it('BUG-041 nút theo máy trạng thái SRS §9 — Thành công là cuối, không còn done', () => {
    expect(requestActions('new')).toEqual({
      next: 'consulting',
      canReject: true,
      canReopen: false,
    });
    expect(requestActions('won')).toEqual({ next: null, canReject: false, canReopen: false });
    expect(requestActions('lost')).toEqual({ next: null, canReject: false, canReopen: true });
  });

  it('bỏ qua bình luận rỗng', () => {
    expect(hasText('<p>&nbsp;</p>')).toBe(false);
    expect(hasText('<p>Ok</p>')).toBe(true);
  });
});
