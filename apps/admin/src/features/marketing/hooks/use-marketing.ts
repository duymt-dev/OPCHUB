'use client';

import type { CampaignAudience } from '@opchub/shared/api-domains';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchCampaigns,
  fetchEstimate,
  fetchGroups,
  fetchMailLog,
  fetchSummary,
  fetchTemplates,
  fetchWelcome,
  marketingKeys,
} from '../api';

export const useMarketingSummary = () =>
  useQuery({ queryKey: marketingKeys.summary, queryFn: fetchSummary });

export const useCampaigns = (enabled = true) =>
  useQuery({
    queryKey: marketingKeys.campaigns,
    queryFn: fetchCampaigns,
    select: (r) => r.items,
    enabled,
  });

export const useMailLog = (enabled: boolean) =>
  useQuery({
    queryKey: marketingKeys.log,
    queryFn: fetchMailLog,
    select: (r) => r.items,
    enabled,
  });

export const useWelcomeMail = (enabled: boolean) =>
  useQuery({ queryKey: marketingKeys.welcome, queryFn: fetchWelcome, enabled });

export const useMailTemplates = (enabled: boolean) =>
  useQuery({
    queryKey: marketingKeys.templates,
    queryFn: fetchTemplates,
    select: (r) => r.items,
    enabled,
    staleTime: 5 * 60_000,
  });

export const useGroupOptions = (enabled: boolean) =>
  useQuery({
    queryKey: marketingKeys.groups,
    queryFn: fetchGroups,
    select: (p) => p.items.map((g) => ({ id: g.id, name: g.name })),
    enabled,
    staleTime: 5 * 60_000,
  });

/** "Ước tính N người nhận" — server đếm theo đối tượng / nhóm đã chọn */
export const useEstimate = (audience: CampaignAudience, groupIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: marketingKeys.estimate(audience, groupIds),
    queryFn: () => fetchEstimate(audience, groupIds),
    select: (r) => r.recipients,
    placeholderData: keepPreviousData,
    enabled,
  });
