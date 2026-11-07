import { createHash, randomUUID } from 'node:crypto';
import { AI_PROVIDER_IDS, botThreadListSchema, type BotThread } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { botTab } from '../behavior/helpers/bot-ui';
import { prepareRealParticipants } from './participants';
import { isolateNativeAutoTopics } from './auto-provider-setup';
import { callMetadata, matrixSession, verifyStoredProvider } from './provider-matrix';

test.use({ botManual: true });

for (const id of AI_PROVIDER_IDS) {
  test(`B2 ${id} verify and real bot reply @live REQ-628`, async ({ page, context }, info) => {
    const session = await matrixSession(page);
    const provider = session.current.providers.find((p) => p.id === id);
    test.skip(!provider?.enabled || !provider.hasKey, 'NOT TESTED: disabled or no stored key');
    const started = new Date();
    let verify: Awaited<ReturnType<typeof verifyStoredProvider>> | undefined;
    let execution: BotThread | undefined;
    let receipt: { characters: number; bodyDigest: string } | undefined;
    try {
      await session.stopBot();
      await session.boundReplies();
      expect(session.current.log, 'Live verification requires metadata logging').toBe(true);
      callMetadata(started); // Validate the private DB target before spending tokens.
      await isolateNativeAutoTopics(page);
      // Disable auto-generation before exposing the selected real provider to a worker.
      const prepared = await prepareRealParticipants(page);
      await session.select(id);
      verify = await verifyStoredProvider(page, id);
      expect(verify.ok, 'Stored-key verification must succeed').toBe(true);
      await prepareRealParticipants(page);
      await prepared.toggle('Tự trả lời thành viên thật', true);
      await prepared.toggle('Chế độ tự động', true);
      await botTab(page, 'Hội thoại');
      const member = await context.newPage();
      await member.goto(`${PORTAL_URL}/login`);
      await member
        .locator('input[autocomplete=username], input[type=email]')
        .fill('an.nguyen@mediasoft.vn');
      await member.locator('input[type=password]').fill('User@2026');
      await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await member.waitForURL(/\/dashboard$/);
      await member.goto(`${PORTAL_URL}/chat/c1`);
      const question = `B2 ${randomUUID()}: Cho tôi một mẹo quản lý thời gian ngắn gọn?`;
      await member.getByPlaceholder(/^Nhắn tin trong #/).fill(question);
      await member.getByPlaceholder(/^Nhắn tin trong #/).press('Enter');
      await expect
        .poll(
          async () => {
            const response = await page.waitForResponse(
              (r) => new URL(r.url()).pathname === '/v1/admin/bot/threads' && r.status() === 200,
            );
            execution = botThreadListSchema
              .parse(await response.json())
              .items.find((thread) => thread.kind === 'reply' && thread.topic === question);
            const failed = callMetadata(started).some(
              (call) => call.provider === id && call.status === 'error',
            );
            if (failed) throw new Error('Provider error recorded; stop instead of retrying live');
            return execution?.status;
          },
          { timeout: 300000 },
        )
        .toBe('done');
      await prepared.toggle('Tự trả lời thành viên thật', false);
      await prepared.toggle('Chế độ tự động', false);
      const body = execution?.lines[0]?.body.trim() ?? '';
      expect(body.length, 'A real reply must be persisted').toBeGreaterThan(0);
      // Boolean assertion avoids printing the generated content on failure.
      expect(await member.getByText(body, { exact: true }).isVisible()).toBe(true);
      receipt = {
        characters: body.length,
        bodyDigest: createHash('sha256').update(body).digest('hex'),
      };
    } finally {
      try {
        await session.restore();
        const calls = callMetadata(started).filter((call) => call.provider === id);
        await info.attach('provider-matrix-receipt', {
          body: JSON.stringify({
            provider: id,
            model: provider?.model,
            startedAt: started.toISOString(),
            verify,
            bot: { status: execution?.status ?? 'not-completed', ...receipt },
            calls,
          }),
          contentType: 'application/json',
        });
        if (receipt) {
          expect(calls.length, 'One worker completion; verify is counted separately').toBe(1);
          expect(calls[0]?.status).toBe('ok');
        }
      } finally {
        // Prevent Playwright's failure-only accessibility snapshot from containing chat text.
        await context.close();
      }
    }
  });
}
