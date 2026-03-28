/**
 * React Query hooks for API key operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/src/lib/api'
import { ApiKey } from '@/src/types'

// Query keys
const apiKeyKeys = {
  all: ['apiKeys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
}

/**
 * Fetch all API keys for the organization
 */
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<ApiKey[]>('/api/api-keys')
      return response.data
    },
  })
}

/**
 * Create a new API key
 */
interface CreateApiKeyInput {
  name: string
  scopes: string[]
}

interface CreateApiKeyResponse extends ApiKey {
  secret?: string // Full key returned only on creation
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const response = await apiClient.post<CreateApiKeyResponse>(
        '/api/api-keys',
        input
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() })
    },
  })
}

/**
 * Revoke an API key
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyId: string) => {
      await apiClient.delete(`/api/api-keys/${keyId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() })
    },
  })
}
