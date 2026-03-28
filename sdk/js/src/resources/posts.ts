import { HttpClient } from '../client'
import { Post, CreatePostParams } from '../types'

export class PostsResource {
  constructor(private readonly http: HttpClient) {}

  async list(boardId: string): Promise<Post[]> {
    return this.http.get<Post[]>(`/v1/boards/${boardId}/posts`)
  }

  async create(boardId: string, params: CreatePostParams): Promise<Post> {
    return this.http.post<Post>(`/v1/boards/${boardId}/posts`, params)
  }

  async delete(postId: string): Promise<void> {
    await this.http.delete(`/v1/posts/${postId}`)
  }
}
