import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export interface PromptFieldDef {
  key: string;
  label: string;
  type: 'choice' | 'number' | 'boolean' | 'text';
  options?: { value: string; label: string }[];
}

export interface PromptCatalog {
  sessionStartFields: PromptFieldDef[];
  sessionEndFireFields: PromptFieldDef[];
  sessionEndLightningFields: PromptFieldDef[];
  sessionEndAtexFields: PromptFieldDef[];
  sessionPromptData: Record<string, unknown> | null;
  completeBlockers: string[];
  onScanPromptsByTypeNl: Record<string, PromptFieldDef[]>;
}

export function usePromptCatalog(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['prompt-catalog', sessionId],
    queryFn: () => apiClient<PromptCatalog>(`/api/sessions/${sessionId}/prompts/catalog`),
    enabled: !!sessionId,
    staleTime: 30_000,
    retry: 1,
  });
}
