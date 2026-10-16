import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { feeHandlers } from './fees';
import { listHandlers } from './lists';
import { memberHandlers } from './members';
import { shellHandlers } from './shell';

export const handlers = [...authHandlers, ...shellHandlers];
// Handler theo màn đứng trước listHandlers để thay bản danh sách cơ bản (cùng đường dẫn)
handlers.push(...memberHandlers);
handlers.push(...listHandlers);
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
handlers.push(...feeHandlers);
