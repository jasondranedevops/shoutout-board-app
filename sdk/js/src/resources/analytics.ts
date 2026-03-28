import { HttpClient } from '../client'
import { OrgAnalytics, BoardAnalytics } from '../types'

export class AnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  async getOrg(): Promise<OrgAnalytics> {
    return this.http.get<OrgAnalytics>('/v1/analytics')
  }

  async getBoard(boardId: string): Promise<BoardAnalytics> {
    return this.http.get<BoardAnalytics>(`/v1/analytics/boards/${boardId}`)
  }
}
