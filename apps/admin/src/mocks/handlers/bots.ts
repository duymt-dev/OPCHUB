import { botCatalogHandlers } from './bot-catalog';
import { botEmergencyHandlers } from './bot-emergency';
import { botRuntimeHandlers } from './bot-runtime';

/** Native bot permission, validation and successful-mutation audit boundaries. */
export const botHandlers = [...botEmergencyHandlers, ...botCatalogHandlers, ...botRuntimeHandlers];
