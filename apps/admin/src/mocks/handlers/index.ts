import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { listHandlers } from './lists';
import { shellHandlers } from './shell';

export const handlers = [...authHandlers, ...shellHandlers, ...listHandlers];
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
