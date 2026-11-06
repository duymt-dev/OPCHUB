import { aiSettingsSchema } from '@opchub/shared/api-domains';
import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_IDS,
  DEFAULT_AI_SETTINGS,
  type AiSettingsUpdate,
} from '@opchub/shared/api-domains';
import type { TestApp } from '../setup/test-app';
export function aiDraft(
  baseUrl: string,
  key = 'local-test-private-key',
  model = 'stub-model',
): AiSettingsUpdate {
  return {
    ...DEFAULT_AI_SETTINGS,
    timeoutMs: 1000,
    budget: 0,
    use: { bot: 'custom', script: 'custom', content: '', mod: '' },
    fallback: '',
    providers: AI_PROVIDER_IDS.map((id) => ({
      id,
      enabled: id === 'custom',
      baseUrl: id === 'custom' ? baseUrl : AI_PROVIDER_CATALOG[id].baseUrl,
      model: id === 'custom' ? model : (AI_PROVIDER_CATALOG[id].models[0] ?? ''),
      key: id === 'custom' ? key : '',
      priceIn: 0,
      priceOut: 0,
    })),
  };
}
export async function snapshotAi(t: TestApp) {
  const providers = await t.prisma.db.llmProvider.findMany();
  const settings = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'ai' } });
  return { providers, settings };
}
export async function restoreAi(t: TestApp, state: Awaited<ReturnType<typeof snapshotAi>>) {
  await t.prisma.db.$transaction(async (tx) => {
    await tx.llmProvider.deleteMany();
    await tx.llmProvider.createMany({ data: state.providers });
    await tx.appSetting.update({
      where: { key: 'ai' },
      data: { value: aiSettingsSchema.parse(state.settings.value) },
    });
  });
  await t.redis.client.del('llm:requests:minute');
}
