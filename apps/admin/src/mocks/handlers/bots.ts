import { botCatalogHandlers } from './bot-catalog';
import { botEmergencyHandlers } from './bot-emergency';
import { botRuntimeHandlers } from './bot-runtime';
import { botDemoScenarioHandlers } from './bot-demo-scenario';

/** Native bot permission, validation and successful-mutation audit boundaries. */
export const botHandlers = [
  ...botDemoScenarioHandlers,
  ...botEmergencyHandlers,
  ...botCatalogHandlers,
  ...botRuntimeHandlers,
];
