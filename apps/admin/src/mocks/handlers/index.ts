import { adminProjectHandlers } from './admin-projects';
import { adminEventHandlers } from './admin-events';
import { adminGroupHandlers } from './admin-groups';
import { adminContentHandlers } from './admin-content';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { botHandlers } from './bots';
import { feeHandlers } from './fees';
import { investorHandlers } from './investors';
import { listHandlers } from './lists';
import { memberHandlers } from './members';
import { serviceRequestHandlers } from './service-requests';
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
// Nhà đầu tư gộp + Dịch vụ (G5c) thay bản cơ bản cùng đường dẫn của admin-content/admin-system
handlers.unshift(...investorHandlers, ...serviceRequestHandlers);
// Kiểm duyệt dự án (G5b): thay bản cơ bản ở admin-content, đứng trước để khớp trước
handlers.unshift(...adminProjectHandlers);
handlers.unshift(...adminEventHandlers);
