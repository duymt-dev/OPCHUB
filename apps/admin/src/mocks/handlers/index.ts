import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { botHandlers } from './bots';
import { feeHandlers } from './fees';
import { listHandlers } from './lists';
import { shellHandlers } from './shell';

export const handlers = [...authHandlers, ...shellHandlers, ...listHandlers];
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
// Bot tương tác đặt trước admin-system: ghi đè "Chạy ngay" + audit rồi chuyển tiếp CRUD
handlers.unshift(...botHandlers);
handlers.push(...feeHandlers);
