/**
 * React Query hooks for analytics
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/src/lib/api'
import { OrgAnalytics, AnalyticsTrend, BoardAnalytics } from '@/src/types'

const analyticsKeys = {
  org: ['analytics', 'org'] as const,
  trends: ['analytics', 'trends'] as const,
  board: (id: string) => ['analytics', 'board', id] as const,
}

export function useOrgAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.org,
    queryFn: async () => {
      const response = await apiClient.get<any>('/v1/analytics')
      return response.data.data as OrgAnalytics
    },
  })
}

export function useAnalyticsTrends() {
  return useQuery({
    queryKey: analyticsKeys.trends,
    queryFn: async () => {
      const response = await apiClient.get<any>('/v1/analytics/trends')
      return response.data.data as AnalyticsTrend[]
    },
  })
}

export function useBoardAnalytics(boardId: string) {
  return useQuery({
    queryKey: analyticsKeys.board(boardId),
    queryFn: async () => {
      const response = await apiClient.get<any>(`/v1/analytics/boards/${boardId}`)
      return response.data.data as BoardAnalytics
    },
    enabled: !!boardId,
  })
}
