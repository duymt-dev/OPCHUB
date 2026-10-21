import auth from '../../messages/vi/auth.json';
import affiliate from '../../messages/vi/affiliate.json';
import chat from '../../messages/vi/chat.json';
import common from '../../messages/vi/common.json';
import community from '../../messages/vi/community.json';
import dashboard from '../../messages/vi/dashboard.json';
import events from '../../messages/vi/events.json';
import membership from '../../messages/vi/membership.json';
import services from '../../messages/vi/services.json';
import profile from '../../messages/vi/profile.json';
import projects from '../../messages/vi/projects.json';
import shell from '../../messages/vi/shell.json';
import type { Bundle } from './locales';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng (tiếng Việt: nguồn + kiểu) */
export const messages = {
  auth,
  affiliate,
  common,
  community,
  chat,
  dashboard,
  shell,
  events,
  services,
  membership,
  profile,
  projects,
};

export type Messages = typeof messages;
export const NAMESPACES = Object.keys(messages) as (keyof Messages)[];

type Node = string | Node[] | { [k: string]: Node };

/**
 * Khoá thiếu ở bản dịch rơi về tiếng Việt (D-65). Giữ nguyên mảng (`t.raw('benefits')` dùng
 * `.map`) — mảng dịch khác độ dài thì lấy cả mảng `vi`.
 */
export function overlay(base: Node, over: unknown): Node {
  if (typeof base === 'string') return typeof over === 'string' && over !== '' ? over : base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over) || over.length !== base.length) return base;
    return base.map((v, i) => overlay(v, over[i]));
  }
  const src = over && typeof over === 'object' ? (over as Record<string, unknown>) : {};
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, overlay(v, src[k])]));
}

/** Nạp bản dịch theo bộ — import động để server chỉ đọc đúng bộ đang dùng */
export async function loadMessages(bundle: Bundle): Promise<Messages> {
  if (bundle === 'vi') return messages;
  const parts = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod: unknown = await import(`../../messages/${bundle}/${ns}.json`).catch(() => null);
      const data = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
      return [ns, overlay(messages[ns], data)] as const;
    }),
  );
  return Object.fromEntries(parts) as unknown as Messages;
}
