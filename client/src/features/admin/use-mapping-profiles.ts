import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface MappingProfileListItem {
  id: string;
  name: string;
  country: string;
  hasRegionLogic: boolean;
  odooExportEnabled: boolean;
  active: boolean;
  _count: {
    subcontractors: number;
    mappingRules: number;
    subassetConfigs: number;
    sessions: number;
  };
}

export interface SubcontractorObjectType {
  objectTypeId: string;
  objectType: { id: string; nameNl: string };
}

export interface ProfileSubcontractor {
  id: string;
  profileId: string;
  name: string;
  exportLabel: string;
  active: boolean;
  objectTypes: SubcontractorObjectType[];
}

export interface ProfileMappingRule {
  id: string;
  profileId: string;
  objectTypeId: string;
  objectType: { id: string; nameNl: string };
  regime: string | null;
  region: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  odooProductCode: string;
  startPriceProductCode: string | null;
  labelNl: string | null;
  priority: number;
  active: boolean;
}

export interface ProfileSubassetConfig {
  id: string;
  profileId: string;
  parentObjectTypeId: string;
  childObjectTypeId: string;
  sortOrder: number;
  parentObjectType: { id: string; nameNl: string };
  childObjectType: { id: string; nameNl: string };
}

export interface ProfileDetail {
  id: string;
  name: string;
  country: string;
  hasRegionLogic: boolean;
  odooExportEnabled: boolean;
  active: boolean;
  subcontractors: ProfileSubcontractor[];
  mappingRules: ProfileMappingRule[];
  subassetConfigs: ProfileSubassetConfig[];
}

export function useMappingProfilesList() {
  return useQuery({
    queryKey: ['mapping-profiles'],
    queryFn: () => apiClient<MappingProfileListItem[]>('/api/admin/mapping-profiles'),
  });
}

export function useMappingProfileDetail(profileId: string | null) {
  return useQuery({
    queryKey: ['mapping-profiles', profileId],
    queryFn: () => apiClient<ProfileDetail>(`/api/admin/mapping-profiles/${profileId}`),
    enabled: !!profileId,
  });
}

export function useCreateMappingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; country: string; hasRegionLogic: boolean; odooExportEnabled: boolean }) =>
      apiClient<ProfileDetail>('/api/admin/mapping-profiles', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles'] });
    },
  });
}

export function useUpdateMappingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; country?: string; hasRegionLogic?: boolean; odooExportEnabled?: boolean; active?: boolean }) =>
      apiClient(`/api/admin/mapping-profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles'] });
    },
  });
}

export function useCreateSubcontractor(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; exportLabel: string; objectTypeIds?: string[] }) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/subcontractors`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}

export function useUpdateSubcontractor(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subId, ...data }: { subId: string; name?: string; exportLabel?: string; objectTypeIds?: string[]; active?: boolean }) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/subcontractors/${subId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}

export function useCreateProfileRule(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      objectTypeId: string;
      regime?: string | null;
      region?: string | null;
      minQuantity?: number | null;
      maxQuantity?: number | null;
      odooProductCode: string;
      startPriceProductCode?: string | null;
      labelNl?: string | null;
      priority?: number;
    }) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/rules`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}

export function useDeleteProfileRule(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/rules/${ruleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}

export function useCreateSubassetConfig(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { parentObjectTypeId: string; childObjectTypeId: string; sortOrder?: number }) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/subasset-configs`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}

export function useDeleteSubassetConfig(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) =>
      apiClient(`/api/admin/mapping-profiles/${profileId}/subasset-configs/${configId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mapping-profiles', profileId] });
    },
  });
}
