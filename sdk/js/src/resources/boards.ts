import { HttpClient } from '../client'
import {
  Board,
  CreateBoardParams,
  UpdateBoardParams,
  ListBoardsParams,
  PaginatedResult,
} from '../types'

interface ListBoardsResponse {
  boards: Board[]
  pagination: { limit: number; offset: number; total: number }
}

export class BoardsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: ListBoardsParams): Promise<PaginatedResult<Board>> {
    const result = await this.http.get<ListBoardsResponse>('/v1/boards', {
      status: params?.status,
      occasionType: params?.occasionType,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })
    return {
      items: result.boards,
      pagination: result.pagination,
    }
  }

  async get(boardId: string): Promise<Board> {
    return this.http.get<Board>(`/v1/boards/${boardId}`)
  }

  async create(params: CreateBoardParams): Promise<Board> {
    return this.http.post<Board>('/v1/boards', params)
  }

  async update(boardId: string, params: UpdateBoardParams): Promise<Board> {
    return this.http.patch<Board>(`/v1/boards/${boardId}`, params)
  }

  async delete(boardId: string): Promise<void> {
    await this.http.delete(`/v1/boards/${boardId}`)
  }

  async send(boardId: string): Promise<Board> {
    return this.http.post<Board>(`/v1/boards/${boardId}/send`)
  }

  async schedule(boardId: string, scheduledAt: Date | string): Promise<Board> {
    return this.http.post<Board>(`/v1/boards/${boardId}/schedule`, {
      scheduledAt: new Date(scheduledAt).toISOString(),
    })
  }

  async activate(boardId: string): Promise<Board> {
    return this.http.post<Board>(`/v1/boards/${boardId}/activate`)
  }

  async getPublic(slug: string): Promise<Board> {
    return this.http.get<Board>(`/v1/boards/${slug}/public`)
  }
}
