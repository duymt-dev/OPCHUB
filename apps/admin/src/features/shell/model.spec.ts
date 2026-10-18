import { describe, expect, it } from 'vitest';
import { adminLinkOf } from './model';

const NAV = ['/overview', '/requests', '/members'];

describe('adminLinkOf (BUG-023)', () => {
  it('BUG-023 link route Admin → điều hướng giữ query', () => {
    expect(adminLinkOf('/requests?code=YC-0005', NAV)).toBe('/requests?code=YC-0005');
    expect(adminLinkOf('/requests/catalog', NAV)).toBe('/requests/catalog');
    expect(adminLinkOf('/members', NAV)).toBe('/members');
  });

  it('BUG-023 link Portal / ngoài / open-redirect → null', () => {
    expect(adminLinkOf('/dashboard', NAV)).toBeNull();
    expect(adminLinkOf('/chat/c1', NAV)).toBeNull();
    expect(adminLinkOf('/requestsx', NAV)).toBeNull();
    expect(adminLinkOf('//evil.com/requests', NAV)).toBeNull();
    expect(adminLinkOf('/\\evil.com', NAV)).toBeNull();
    expect(adminLinkOf('https://evil.com/requests', NAV)).toBeNull();
    expect(adminLinkOf('', NAV)).toBeNull();
  });
});
