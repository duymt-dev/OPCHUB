import { hasText } from './model';

describe('requests model', () => {
  it('bỏ qua bình luận rỗng', () => {
    expect(hasText('<p>&nbsp;</p>')).toBe(false);
    expect(hasText('<p>Ok</p>')).toBe(true);
  });
});
