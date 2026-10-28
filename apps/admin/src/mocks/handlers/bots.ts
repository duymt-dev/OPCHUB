import { botCatalogHandlers } from './bot-catalog';
import { botEmergencyHandlers } from './bot-emergency';
import { botRuntimeHandlers } from './bot-runtime';
import { botDemoScenarioHandlers } from './bot-demo-scenario';
import { botScheduleHandlers } from './bot-schedule';

/** Native bot permission, validation and successful-mutation audit boundaries. */
export const botHandlers = [
  ...botScheduleHandlers,
  ...botDemoScenarioHandlers,
  ...botEmergencyHandlers,
  ...botCatalogHandlers,
  ...botRuntimeHandlers,
];
