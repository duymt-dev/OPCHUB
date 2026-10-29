import { nav, tapLast, waitText } from '../steps';
import type { Scenario } from '../types';
import { settleBotSchedule } from './admin-bot-schedule';

export const ADMIN_BOT_REPLIES: Scenario[] = [
  {
    id: 'D-36-REPLIES',
    name: 'Bot · Trả lời từng tin',
    start: 'admin',
    fullPage: true,
    beforeCapture: settleBotSchedule,
    steps: async (c) => {
      await nav(c, 'Bot tương tác');
      await tapLast(c, 'Trả lời từng tin');
      await waitText(c, 'AI tự chọn nhóm và trả lời từng tin');
    },
  },
];
