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
      const response = await apiClient.get<PaginatedResponse<Board>>(
        '/api/boards',
        {
          params: { page, pageSize },
        }
      )
      return response.data
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
      const response = await apiClient.get<Board>(`/api/boards/${id}`)
      return response.data
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
      const response = await apiClient.post<Board>(
        '/api/boards',
        boardData
      )
      return response.data
    },
    onSuccess: (data) => {
      // Invalidate boards list to refetch
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
      // Add new board to cache
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
      const response = await apiClient.patch<Board>(
        `/api/boards/${boardId}`,
        updates
      )
      return response.data
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
      const response = await apiClient.post<Board>(
        `/api/boards/${boardId}/send`,
        options
      )
      return response.data
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
      await apiClient.delete(`/api/boards/${boardId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() })
    },
  })
}
