/**
 * React Query hooks for API key operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/src/lib/api'

const apiKeyKeys = {
  all: ['apiKeys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
}

export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get<any>('/v1/api-keys')
      return response.data.data?.keys ?? response.data.data ?? response.data
    },
  })
}

interface CreateApiKeyInput {
  name: string
  scopes: string[]
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const response = await apiClient.post<any>('/v1/api-keys', input)
      return response.data.data ?? response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiClient.delete<any>(`/v1/api-keys/${keyId}`)
      return response.data
    },
    // Optimistic update — remove the key from the cache immediately
    onMutate: async (keyId: string) => {
      await queryClient.cancelQueries({ queryKey: apiKeyKeys.lists() })
      const previous = queryClient.getQueryData(apiKeyKeys.lists())
      queryClient.setQueryData(apiKeyKeys.lists(), (old: any[]) =>
        Array.isArray(old) ? old.filter((k) => k.id !== keyId) : old
      )
      return { previous }
    },
    // If the API call fails, roll back to the previous list
    onError: (_err, _keyId, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(apiKeyKeys.lists(), context.previous)
      }
    },
    // Always refetch after settle to stay in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() })
    },
  })
}
