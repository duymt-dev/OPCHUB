import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { listHandlers } from './lists';

export const handlers = [...authHandlers, ...listHandlers];
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
