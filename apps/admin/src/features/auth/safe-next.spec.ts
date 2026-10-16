import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('giữ đường dẫn nội bộ', () => {
    expect(safeNext('/members?page=2', '/overview')).toBe('/members?page=2');
  });

  it('chặn URL ngoài và protocol-relative', () => {
    expect(safeNext('https://evil.com', '/overview')).toBe('/overview');
    expect(safeNext('//evil.com', '/overview')).toBe('/overview');
    expect(safeNext('/\\evil.com', '/overview')).toBe('/overview');
    expect(safeNext(null, '/overview')).toBe('/overview');
  });
});
