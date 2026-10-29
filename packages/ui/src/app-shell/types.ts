import type { ReactNode } from 'react';
import type { IconName } from '../icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  badge?: number;
  /** Tiêu đề nhóm hiện phía trên mục này (prototype v4 `GR`: "CỘNG ĐỒNG", …) */
  group?: string;
}

export interface ShellUser {
  name: string;
  subtitle: string;
  avatarUrl?: string;
  avatarColor?: string;
  avatarText?: string;
}

export interface ShellLabels {
  navTitle: string;
  search: string;
  notifications: string;
  menu: string;
  back: string;
  collapse: string;
  /** Nhãn/tooltip nút khi sidebar đang thu gọn (BUG-027: bắt buộc, thiếu thì Admin kẹt chữ "Thu gọn") */
  expand: string;
  language: string;
  profile: string;
  logout: string;
  /** Mục "Cài đặt hệ thống" trong menu người dùng (prototype v4 `umSettings`); chỉ cần khi có `onSettings` */
  settings?: string;
}

export interface AppShellProps {
  logoSrc: string;
  logoAlt: string;
  brandTag?: string;
  nav: NavItem[];
  activeKey: string;
  pageTitle: string;
  user: ShellUser;
  labels: ShellLabels;
  unreadCount?: number;
  /** Khối phụ ở chân sidebar (ver2: "Sự kiện sắp tới") */
  sidebarExtra?: ReactNode;
  onNavigate?: (href: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  /** Có → menu người dùng hiện "Cài đặt hệ thống" (Admin, khi có quyền Cài đặt) */
  onSettings?: () => void;
  /** Nút chuông + dropdown thông báo; bỏ trống = chuông tĩnh với `unreadCount` */
  notifications?: ReactNode;
  /** Nút + bảng chọn ngôn ngữ; bỏ trống = nút tĩnh `labels.language` */
  language?: ReactNode;
  /** Giá trị tìm kiếm trên topbar */
  searchQuery?: string;
  /** Callback khi người dùng submit tìm kiếm trên topbar */
  onSearch?: (query: string) => void;
  /** Tuỳ biến thanh tìm kiếm topbar nếu cần */
  search?: ReactNode;
  children: ReactNode;
}
