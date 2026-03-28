/**
 * React Query hooks for board operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/src/lib/api'
import { Board, PaginatedResponse } from '@/src/types'

// Query keys
const boardKeys = {
  all: ['boards'] as const,
  lists: () => [...boardKeys.all, 'list'] as const,
  detail: (id: string) => [...boardKeys.all, 'detail', id] as const,
}

/**
 * Fetch all boards for the organization
 */
export function useBoards(page: number = 1, pageSize: number = 12) {
  return useQuery({
    queryKey: [...boardKeys.lists(), page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<any>(
        '/v1/boards',
        { params: { limit: pageSize, offset: (page - 1) * pageSize } }
      )
      return response.data.data ?? response.data
    },
  })
}

/**
 * Fetch a single board by ID
 */
export function useBoard(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<any>(`/v1/boards/${id}`)
      return response.data.data ?? response.data
    },
    enabled: !!id,
  })
}

/**
 * Create a new board
 */
export function useCreateBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boardData: Partial<Board>) => {
      const response = await apiClient.post<any>('/v1/boards', boardData)
      return response.data.data ?? response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
      queryClient.setQueryData(boardKeys.detail(data.id), data)
    },
  })
}

/**
 * Update an existing board
 */
export function useUpdateBoard(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Board>) => {
      const response = await apiClient.patch<any>(`/v1/boards/${boardId}`, updates)
      return response.data.data ?? response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(boardKeys.detail(boardId), data)
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
    },
  })
}

/**
 * Send a board (finalize and send to recipient)
 */
export function useSendBoard(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options?: { scheduleFor?: string }) => {
      const response = await apiClient.post<any>(`/v1/boards/${boardId}/send`, options)
      return response.data.data ?? response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(boardKeys.detail(boardId), data)
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
    },
  })
}

/**
 * Delete a board
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boardId: string) => {
      await apiClient.delete(`/v1/boards/${boardId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
    },
  })
}
