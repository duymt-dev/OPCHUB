import { nav, press, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

async function open(c: StepCtx) {
  await nav(c, 'Bot tương tác');
  await waitText(c, 'Lịch chạy bot');
}
const date = (c: StepCtx, index: number, value: string) =>
  c.page.locator('input[type=date]').nth(index).fill(value);

/** Same settled state on both sides: let the real toast expire, then reset scroll. */
export async function settleBotSchedule(c: StepCtx) {
  await c.page.clock.runFor(2300);
  await c.page.evaluate(() => window.scrollTo(0, 0));
}

export const ADMIN_BOT_SCHEDULE: Scenario[] = [
  {
    id: 'D-36-SCHEDULE-WAIT',
    name: 'Bot · lịch tương lai',
    start: 'admin',
    fullPage: true,
    beforeCapture: settleBotSchedule,
    steps: async (c) => {
      await open(c);
      await date(c, 0, '2099-01-01');
      await waitText(c, 'Chờ lịch');
    },
  },
  {
    id: 'D-36-SCHEDULE-END',
    name: 'Bot · hết lịch',
    start: 'admin',
    fullPage: true,
    beforeCapture: settleBotSchedule,
    steps: async (c) => {
      await open(c);
      await date(c, 1, '2020-01-01');
      await waitText(c, 'Hết lịch');
    },
  },
  {
    id: 'D-36-SCHEDULE-PAUSE',
    name: 'Bot · tạm dừng',
    start: 'admin',
    fullPage: true,
    beforeCapture: settleBotSchedule,
    steps: async (c) => {
      await open(c);
      await press(c, 'Tạm dừng bot');
      await waitText(c, 'Chạy lại bot');
    },
  },
  {
    id: 'D-36-SCHEDULE-CLEAR',
    name: 'Bot · xóa lịch vẫn tạm dừng',
    start: 'admin',
    fullPage: true,
    beforeCapture: settleBotSchedule,
    steps: async (c) => {
      await open(c);
      await date(c, 0, '2099-01-01');
      await waitText(c, 'Chờ lịch');
      await press(c, 'Tạm dừng bot');
      await waitText(c, 'Chạy lại bot');
      await press(c, 'Xóa lịch');
      await waitText(c, 'Chưa đặt lịch · bot chạy liên tục');
    },
  },
];
