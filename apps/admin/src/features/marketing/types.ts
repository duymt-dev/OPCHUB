import { MAIL_VARIABLES, type CampaignAudience } from '@opchub/shared/api-domains';

/** Tab trên URL (`?tab=auto`) — mặc định "Chiến dịch" */
export const MARKETING_TABS = ['campaigns', 'auto', 'log'] as const;
export type MarketingTab = (typeof MARKETING_TABS)[number];

export interface MarketingParams {
  tab: MarketingTab;
}

/** Trạng thái form "Tạo chiến dịch email" (chưa gửi lên server) */
export interface CampaignFormState {
  /** id mẫu đang chọn; '' = Trống */
  tpl: string;
  name: string;
  subject: string;
  body: string;
  audience: CampaignAudience;
  groupIds: string[];
  /** giá trị ô datetime-local (giờ VN) */
  at: string;
}

export type CampaignFormError = 'name' | 'subject' | 'groups' | 'at';
/** Mỗi lỗi chiến dịch nằm ở đúng một ô cùng tên (BUG-022) */
export type CampaignFormErrors = Partial<Record<CampaignFormError, CampaignFormError>>;

/** Yêu cầu mở hộp xác nhận cho thao tác không hoàn tác (Gửi ngay / Xóa) */
export interface ConfirmRequest {
  title: string;
  body: string;
  okLabel: string;
  /** Nút đỏ cho xoá; xanh cho gửi */
  danger: boolean;
  onOk: () => void;
}

/** Biến chèn vào nội dung như prototype — nguồn chung với server (thay khi gửi) */
export const MAIL_VARS = MAIL_VARIABLES;
