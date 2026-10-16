import { adminEventHandlers } from './admin-events';
import { adminGroupHandlers } from './admin-groups';
import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { botHandlers } from './bots';
import { feeHandlers } from './fees';
import { listHandlers } from './lists';
import { memberHandlers } from './members';
import { shellHandlers } from './shell';

export const handlers = [...authHandlers, ...shellHandlers];
// Handler theo màn đứng trước listHandlers để thay bản danh sách cơ bản (cùng đường dẫn)
handlers.push(...memberHandlers);
handlers.push(...listHandlers);
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
// Bot tương tác đặt trước admin-system: ghi đè "Chạy ngay" + audit rồi chuyển tiếp CRUD
handlers.unshift(...botHandlers);
handlers.push(...feeHandlers);
handlers.unshift(...adminGroupHandlers);
handlers.unshift(...adminEventHandlers);
