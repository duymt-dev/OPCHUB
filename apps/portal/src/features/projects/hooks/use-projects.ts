'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchComments,
  fetchGroups,
  fetchInterests,
  fetchMine,
  fetchOwnProject,
  fetchOwnerProfile,
  fetchProject,
  fetchProjects,
  fetchStats,
  fetchThreads,
  projectKeys,
  type ListFilter,
  ownerContactOf,
  ownerProfileKey,
} from '../api';

export const useProjectStats = () =>
  useQuery({ queryKey: projectKeys.stats(), queryFn: fetchStats });

export const useProjectList = (f: ListFilter) =>
  useQuery({
    queryKey: projectKeys.list(f),
    queryFn: () => fetchProjects(f),
    placeholderData: keepPreviousData,
  });

export const useMyProjects = () => useQuery({ queryKey: projectKeys.mine(), queryFn: fetchMine });

export const useProject = (id: string) =>
  useQuery({ queryKey: projectKeys.detail(id), queryFn: () => fetchProject(id), retry: false });

/** Dữ liệu form sửa (mọi trạng thái, chỉ chủ dự án) */
export const useOwnProject = (id: string | null) =>
  useQuery({
    queryKey: projectKeys.own(id ?? ''),
    queryFn: () => fetchOwnProject(id ?? ''),
    enabled: !!id,
  });

/** Email/SĐT hồ sơ để điền sẵn liên hệ công khai khi tạo dự án mới (BUG-016) */
export const useOwnerContact = (enabled: boolean) =>
  useQuery({
    queryKey: ownerProfileKey,
    queryFn: fetchOwnerProfile,
    enabled,
    select: ownerContactOf,
  });

export const useComments = (id: string) =>
  useQuery({ queryKey: projectKeys.comments(id), queryFn: () => fetchComments(id) });

export const useInterests = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: projectKeys.interests(id),
    queryFn: () => fetchInterests(id),
    enabled,
  });

export const useThreads = (enabled: boolean) =>
  useQuery({ queryKey: projectKeys.threads(), queryFn: fetchThreads, enabled });

/** Nhóm đã tham gia: chia sẻ dự án / chọn nhóm trong form */
export const useJoinedGroups = () =>
  useQuery({
    queryKey: projectKeys.groups(),
    queryFn: fetchGroups,
    // `order` = vị trí trong danh sách 34 nhóm — quyết định tông màu như prototype
    select: (p) =>
      p.items.map((g, order) => ({ ...g, order })).filter((g) => g.myStatus === 'member'),
  });
