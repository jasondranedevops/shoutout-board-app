import { HttpClient } from '../client'
import { WebhookSubscription, WebhookDelivery, CreateWebhookParams } from '../types'

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<WebhookSubscription[]> {
    return this.http.get<WebhookSubscription[]>('/v1/webhooks')
  }

  async create(params: CreateWebhookParams): Promise<WebhookSubscription> {
    return this.http.post<WebhookSubscription>('/v1/webhooks', params)
  }

  async delete(webhookId: string): Promise<void> {
    await this.http.delete(`/v1/webhooks/${webhookId}`)
  }

  async listDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    return this.http.get<WebhookDelivery[]>(`/v1/webhooks/${webhookId}/deliveries`)
  }
}
