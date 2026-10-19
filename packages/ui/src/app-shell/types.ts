import type { ReactNode } from 'react';
import type { IconName } from '../icons';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  badge?: number;
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
  /** Nút chuông + dropdown thông báo; bỏ trống = chuông tĩnh với `unreadCount` */
  notifications?: ReactNode;
  /** Nút + bảng chọn ngôn ngữ; bỏ trống = nút tĩnh `labels.language` */
  language?: ReactNode;
  children: ReactNode;
}
