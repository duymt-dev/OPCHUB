import { expect } from '@playwright/test';
import { nav, press, tapLast, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { settleBotSchedule } from './admin-bot-schedule';

const dialog = (c: StepCtx) =>
  c.side === 'app'
    ? c.page.getByRole('dialog', { name: /AI tạo kịch bản hội thoại hàng loạt/ })
    : c.page.locator('div[style*="880px"][style*="1001"]');

async function open(c: StepCtx) {
  await nav(c, 'Bot tương tác');
  await tapLast(c, 'Kịch bản hội thoại');
  await press(c, 'AI tạo hàng loạt');
  await waitText(c, 'AI tạo kịch bản hội thoại hàng loạt');
  // Let both modal enter lifecycles finish before the harness disables CSS animation.
  await c.page.clock.runFor(350);
  await expect(dialog(c)).toHaveCSS('opacity', '1');
  await expect(dialog(c).getByRole('button', { name: 'Tạo bằng AI', exact: true })).toBeEnabled();
}
async function populate(c: StepCtx) {
  await open(c);
  await dialog(c).locator('textarea').fill('Hóa đơn điện tử cho OPC');
  await dialog(c).locator('input').first().fill('1');
  await dialog(c).getByText('OPC Hà Nội', { exact: true }).click();
}
async function generate(c: StepCtx) {
  await populate(c);
  await dialog(c).getByRole('button', { name: 'Tạo bằng AI', exact: true }).click();
  // The same clock passage lets both real workflows settle; no synthetic result/state.
  await c.page.clock.runFor(2500);
  await waitText(c, 'Kết quả · tích chọn kịch bản muốn lưu');
  await expect(
    dialog(c).getByRole('button', { name: 'Lưu 1 kịch bản', exact: true }),
  ).toBeEnabled();
}

export const ADMIN_BOT_BULK: Scenario[] = [
  {
    id: 'D-39-BULK',
    name: 'Bot · AI tạo hàng loạt',
    start: 'admin',
    steps: open,
    beforeCapture: settleBotSchedule,
  },
  {
    id: 'D-39-BULK-TYPE',
    name: 'Bot · thêm loại hội thoại',
    start: 'admin',
    steps: async (c) => {
      await open(c);
      await tapLast(c, '+ Thêm loại hội thoại');
    },
    beforeCapture: settleBotSchedule,
  },
  {
    id: 'D-39-BULK-FORM',
    name: 'Bot · bulk đã nhập chủ đề/nhóm',
    start: 'admin',
    steps: populate,
    beforeCapture: settleBotSchedule,
  },
  {
    id: 'D-39-BULK-RESULT',
    name: 'Bot · kết quả tạo AI hàng loạt',
    start: 'admin',
    steps: generate,
    note: 'Actual provider result and durable progress remain visible; Q-V42-713-5/6, no masking or payload substitution.',
    beforeCapture: async (c) => {
      await settleBotSchedule(c);
      await dialog(c)
        .getByText('Kết quả · tích chọn kịch bản muốn lưu', { exact: true })
        .evaluate((heading) => heading.scrollIntoView({ block: 'start', behavior: 'instant' }));
    },
  },
];
