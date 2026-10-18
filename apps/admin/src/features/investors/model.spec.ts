import { canStep, lastInitial, money, projectList } from './model';

describe('investors model', () => {
  it('tiền như MONEY() của prototype', () => {
    expect(money(1_750_000_000)).toBe('1,8 tỷ ₫');
    expect(money(1_000_000_000)).toBe('1 tỷ ₫');
    expect(money(350_000_000)).toBe('350 triệu ₫');
    expect(money(2_500_000, 'USD')).toBe('$2.5M');
  });

  it('dự án bỏ trùng, chữ cái đầu tên', () => {
    expect(projectList(['A', 'B', 'A'])).toBe('A, B');
    expect(lastInitial('Nguyễn Hoàng Nam')).toBe('N');
  });

  it('BUG-007 canStep khoá bước lùi', () => {
    expect(canStep('sent', 'in_discussion')).toBe(true);
    expect(canStep('in_discussion', 'connected')).toBe(true);
    expect(canStep('connected', 'sent')).toBe(false);
    expect(canStep('connected', 'in_discussion')).toBe(false);
    expect(canStep('in_discussion', 'sent')).toBe(false);
    expect(canStep('sent', 'connected')).toBe(false);
  });
});
