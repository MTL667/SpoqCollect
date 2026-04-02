import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface MappingRule {
  id: string;
  objectTypeId: string;
  regime: string | null;
  region: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  odooProductCode: string;
  startPriceProductCode: string | null;
  labelNl: string | null;
  priority: number;
  active: boolean;
  version: number;
  objectType: {
    id: string;
    nameNl: string;
    exportParty: string;
  };
}

export interface OdooProduct {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  active: boolean;
}

export interface MappingRuleInput {
  objectTypeId: string;
  regime?: string | null;
  region?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  odooProductCode: string;
  startPriceProductCode?: string | null;
  labelNl?: string | null;
  priority?: number;
  active?: boolean;
}

export function useMappingRules(objectTypeId?: string) {
  const params = objectTypeId ? `?objectTypeId=${objectTypeId}` : '';
  return useQuery({
    queryKey: ['mapping-rules', objectTypeId ?? 'all'],
    queryFn: () => apiClient<MappingRule[]>(`/api/admin/mapping-rules${params}`),
  });
}

export function useOdooProducts() {
  return useQuery({
    queryKey: ['odoo-products'],
    queryFn: () => apiClient<OdooProduct[]>('/api/admin/mapping-rules/odoo-products/all'),
  });
}

export function useObjectTypesForAdmin() {
  return useQuery({
    queryKey: ['object-types-admin'],
    queryFn: () =>
      apiClient<Array<{ id: string; nameNl: string; exportParty: string; active: boolean }>>(
        '/api/object-types',
      ),
  });
}

export function useCreateMappingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MappingRuleInput) =>
      apiClient<MappingRule>('/api/admin/mapping-rules', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mapping-rules'] }),
  });
}

export function useUpdateMappingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: MappingRuleInput & { id: string }) =>
      apiClient<MappingRule>(`/api/admin/mapping-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mapping-rules'] }),
  });
}

export function useDeleteMappingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ success: boolean }>(`/api/admin/mapping-rules/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mapping-rules'] }),
  });
}
