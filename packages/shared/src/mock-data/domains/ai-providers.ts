import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_IDS,
  DEFAULT_AI_SETTINGS,
  aiSettingsResponseSchema,
  type AiSettingsResponse,
} from '../../api-domains';
export function emptyAiProviders(): AiSettingsResponse {
  return aiSettingsResponseSchema.parse({
    ...DEFAULT_AI_SETTINGS,
    providers: AI_PROVIDER_IDS.map((id) => ({
      id,
      enabled: false,
      baseUrl: AI_PROVIDER_CATALOG[id].baseUrl,
      model: AI_PROVIDER_CATALOG[id].models[0] ?? '',
      hasKey: false,
      keyLast4: null,
      status: 'none',
      checkedAt: null,
      priceIn: 0,
      priceOut: 0,
    })),
    spend: {
      month: new Date()
        .toLocaleDateString('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
        })
        .slice(0, 7),
      cost: 0,
      pct: 0,
    },
  });
}
