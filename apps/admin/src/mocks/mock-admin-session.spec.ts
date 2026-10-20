import { beforeEach, describe, expect, it } from 'vitest';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import { resetMockDb, setMockAdminRole, setMockAdminStatus } from '@opchub/shared/mock-domains';
import {
  clearMockAdminSession,
  mockAdminSessionResponse,
  refreshMockAdminSession,
} from './handlers/mock-admin-session';

beforeEach(() => {
  resetMockDb();
  clearMockAdminSession();
});
describe('REQ-312 Admin MSW refresh for URL/F5', () => {
  it('does not invent a session without a cookie or for malformed/unknown account ids', () => {
    expect(refreshMockAdminSession({}).status).toBe(401);
    document.cookie = 'opchub-msw-admin-session=%3Cscript%3E; Path=/';
    expect(refreshMockAdminSession({}).status).toBe(401);
    expect(mockAdminSessionResponse('missing').status).toBe(401);
  });
  it('restores the same fake account and reads fresh permissions instead of storing grants in the cookie', async () => {
    expect(mockAdminSessionResponse('adm-mai').status).toBe(200);
    const first = adminLoginResponseSchema.parse(await refreshMockAdminSession({}).json());
    expect(first.admin.id).toBe('adm-mai');
    expect(first.admin.permissions).toContain('affiliate.view');
    expect(setMockAdminRole('admin', 'adm-mai', 'role-editor').ok).toBe(true);
    const next = adminLoginResponseSchema.parse(await refreshMockAdminSession({}).json());
    expect(next.admin.id).toBe('adm-mai');
    expect(next.admin.permissions).not.toContain('affiliate.view');
    expect(document.cookie).not.toContain('permissions');
  });
  it('logout clears the fake cookie and refresh rejects a locked account', () => {
    mockAdminSessionResponse('adm-mai');
    expect(setMockAdminStatus('admin', 'adm-mai', 'locked').ok).toBe(true);
    expect(refreshMockAdminSession({}).status).toBe(401);
    expect(clearMockAdminSession().status).toBe(204);
    expect(document.cookie).not.toContain('opchub-msw-admin-session=');
    expect(refreshMockAdminSession({}).status).toBe(401);
  });
});
