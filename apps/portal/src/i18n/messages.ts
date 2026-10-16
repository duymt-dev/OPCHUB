import auth from '../../messages/vi/auth.json';
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

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng */
export const messages = {
  auth,
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
