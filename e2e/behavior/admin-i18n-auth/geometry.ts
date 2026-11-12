import { expect, type Page } from './fixtures';

export async function authGeometry(page: Page, state: 'first-password' | 'mfa') {
  const form = state === 'first-password' ? page.getByRole('dialog') : page.locator('form');
  await expect(form).toBeInViewport({ ratio: 1 });
  const buttons = await form.getByRole('button').evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const outer = node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      return {
        index,
        outer: { left: outer.left, right: outer.right, top: outer.top, bottom: outer.bottom },
        text: [...range.getClientRects()].map((r) => ({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        })),
      };
    }),
  );
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons)
    for (const text of button.text) {
      const receipt = JSON.stringify(button);
      expect(text.left, receipt).toBeGreaterThanOrEqual(button.outer.left - 1);
      expect(text.right, receipt).toBeLessThanOrEqual(button.outer.right + 1);
      expect(text.top, receipt).toBeGreaterThanOrEqual(button.outer.top - 1);
      expect(text.bottom, receipt).toBeLessThanOrEqual(button.outer.bottom + 1);
    }
}
