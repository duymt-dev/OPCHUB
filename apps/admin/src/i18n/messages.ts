import auth from '../../messages/vi/auth.json';
import affiliate from '../../messages/vi/affiliate.json';
import bots from '../../messages/vi/bots.json';
import events from '../../messages/vi/events.json';
import common from '../../messages/vi/common.json';
import fees from '../../messages/vi/fees.json';
import groups from '../../messages/vi/groups.json';
import investors from '../../messages/vi/investors.json';
import members from '../../messages/vi/members.json';
import needs from '../../messages/vi/needs.json';
import overview from '../../messages/vi/overview.json';
import reports from '../../messages/vi/reports.json';
import requests from '../../messages/vi/requests.json';
import projects from '../../messages/vi/projects.json';
import settings from '../../messages/vi/settings.json';
import stores from '../../messages/vi/stores.json';
import marketing from '../../messages/vi/marketing.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng import + 1 dòng trong object */
export const messages = {
  affiliate,
  auth,
  common,
  overview,
  bots,
  fees,
  members,
  groups,
  investors,
  needs,
  stores,
  requests,
  reports,
  projects,
  events,
  settings,
  marketing,
};

export type Messages = typeof messages;
