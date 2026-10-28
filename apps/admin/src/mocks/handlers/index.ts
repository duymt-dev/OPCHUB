import { memberStatusHandlers } from './member-status';
import { adminProjectHandlers } from './admin-projects';
import { adminEventHandlers } from './admin-events';
import { adminGroupHandlers } from './admin-groups';
import { adminContentHandlers } from './admin-content';
import { moderationHandlers } from './moderation';
import { adminMemberHandlers } from './admin-members';
import { adminSystemHandlers } from './admin-system';
import { authHandlers } from './auth';
import { botHandlers } from './bots';
import { feeHandlers } from './fees';
import { investorBridgeHandlers } from './investor-bridge';
import { adminFundraisingHandlers } from './admin-fundraising';
import { adminNeedHandlers } from './admin-needs';
import { adminOnboardingHandlers } from './admin-onboarding';
import { adminReportHandlers } from './admin-reports';
import { adminStoreHandlers } from './admin-stores';
import { investorHandlers } from './investors';
import { listHandlers } from './lists';
import { marketingHandlers } from './marketing';
import { memberHandlers } from './members';
import { serviceRequestHandlers } from './service-requests';
import { settingsHandlers } from './settings';
import { priceConfigHandlers } from './price-config';
import { llmConfigHandlers } from './llm-config';
import { shellHandlers } from './shell';
import { uploadHandlers } from './uploads';
import { affiliateReadHandlers } from './affiliate';
import { affiliateWriteHandlers } from './affiliate-write';
import { affiliateDemoHandlers } from './affiliate-demo';

export const handlers = [...authHandlers, ...shellHandlers];
handlers.push(...llmConfigHandlers);
// Handler theo màn đứng trước listHandlers để thay bản danh sách cơ bản (cùng đường dẫn)
handlers.push(...memberHandlers);
handlers.push(...listHandlers);
handlers.push(...adminMemberHandlers, ...adminContentHandlers, ...adminSystemHandlers);
handlers.unshift(...moderationHandlers);
// Bot tương tác đặt trước admin-system: ghi đè "Chạy ngay" + audit rồi chuyển tiếp CRUD
handlers.unshift(...botHandlers);
handlers.push(...feeHandlers);
handlers.unshift(...adminGroupHandlers);
// Nhà đầu tư gộp + Dịch vụ (G5c) thay bản cơ bản cùng đường dẫn của admin-content/admin-system
handlers.unshift(...investorHandlers, ...serviceRequestHandlers);
// Kiểm duyệt dự án (G5b): thay bản cơ bản ở admin-content, đứng trước để khớp trước
handlers.unshift(...adminProjectHandlers);
// V4-610: thẩm định Gói Gọi vốn + gộp cookie chung với Portal trước handler dự án
handlers.unshift(...adminFundraisingHandlers);
// V4-608 (AD-07): Gian hàng + cookie trạng thái chung với Portal
handlers.unshift(...adminStoreHandlers);
// V4-609 (AD-07): Nhu cầu địa phương
handlers.push(...adminNeedHandlers);
// V4-611 (AD-02): Nhắc hoàn tất hướng dẫn bắt đầu + mẫu email nhắc
handlers.unshift(...adminOnboardingHandlers);
// V4-614 (D-78): Báo cáo B1/B2/B3 — trạng thái job `report` khớp trước bản job thành viên
handlers.unshift(...adminReportHandlers);
handlers.unshift(...adminEventHandlers);
// Cài đặt & Phân quyền (G6a): thay bản cơ bản /admin/categories, PUT roles/permissions + audit
handlers.unshift(...settingsHandlers);
handlers.unshift(...priceConfigHandlers);
// Marketing (G6b): endpoint riêng, không trùng đường dẫn cũ
handlers.push(...marketingHandlers);
// Ảnh qua presign (TIP-V2-102): endpoint riêng /uploads/*
handlers.push(...uploadHandlers);
// Luồng nhà đầu tư chung với Portal MSW (TIP-V2-107): gộp cookie trước mọi handler domain
handlers.unshift(...investorBridgeHandlers);
handlers.push(...affiliateReadHandlers, ...affiliateWriteHandlers);
handlers.unshift(...affiliateDemoHandlers);

handlers.unshift(...memberStatusHandlers);
