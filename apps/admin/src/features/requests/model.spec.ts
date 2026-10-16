import { hasText, requestActions, steps } from './model';

describe('requests model', () => {
  it('step bar sáng tới trạng thái hiện tại, Từ chối tắt hết', () => {
    expect(steps('quoted').map((s) => s.on)).toEqual([true, true, true, false, false]);
    expect(steps('lost').some((s) => s.on)).toBe(false);
  });

  it('nút theo máy trạng thái SRS §8', () => {
    expect(requestActions('new')).toEqual({
      next: 'consulting',
      canReject: true,
      canReopen: false,
    });
    expect(requestActions('won')).toEqual({ next: 'done', canReject: false, canReopen: false });
    expect(requestActions('lost')).toEqual({ next: null, canReject: false, canReopen: true });
    expect(requestActions('done')).toEqual({ next: null, canReject: false, canReopen: false });
  });

  it('bỏ qua bình luận rỗng', () => {
    expect(hasText('<p>&nbsp;</p>')).toBe(false);
    expect(hasText('<p>Ok</p>')).toBe(true);
  });
});
