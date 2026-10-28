import { botCatalogHandlers } from './bot-catalog';
import { botEmergencyHandlers } from './bot-emergency';
import { botRuntimeHandlers } from './bot-runtime';
import { botDemoScenarioHandlers } from './bot-demo-scenario';
import { botScheduleHandlers } from './bot-schedule';
import { botReplyHandlers } from './bot-replies';
import { botConversationTypeHandlers } from './bot-conversation-types';
import { botBulkHandlers } from './bot-bulk';

/** Native bot permission, validation and successful-mutation audit boundaries. */
export const botHandlers = [
  ...botBulkHandlers,
  ...botConversationTypeHandlers,
  ...botReplyHandlers,
  ...botScheduleHandlers,
  ...botDemoScenarioHandlers,
  ...botEmergencyHandlers,
  ...botCatalogHandlers,
  ...botRuntimeHandlers,
];
