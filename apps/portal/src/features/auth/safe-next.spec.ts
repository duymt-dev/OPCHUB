import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('giữ đường dẫn nội bộ', () => {
    expect(safeNext('/events?page=2', '/dashboard')).toBe('/events?page=2');
  });

  it('chặn URL ngoài và protocol-relative', () => {
    expect(safeNext('https://evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeNext('//evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeNext('/\\evil.com', '/dashboard')).toBe('/dashboard');
    expect(safeNext(null, '/dashboard')).toBe('/dashboard');
  });
});
