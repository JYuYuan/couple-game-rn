import type { AIMessage, AIRequestOptions, AIResponse } from '../types'

/**
 * SiliconFlow AI Client
 * 基于 SiliconFlow API 的 AI 服务客户端
 */
export class SiliconFlowClient {
  private apiUrl: string
  private apiKey: string
  private defaultModel: string

  constructor(apiKey?: string, apiUrl?: string, apiModel?: string) {
    // 从参数读取配置
    this.apiKey = apiKey || ''
    this.apiUrl = apiUrl || 'https://api.siliconflow.cn/v1/chat/completions'
    this.defaultModel = apiModel || 'THUDM/GLM-Z1-9B-0414'
  }

  /**
   * 更新配置
   * @param apiKey - API Key
   * @param apiUrl - API URL
   * @param apiModel - API Model
   */
  updateConfig(apiKey?: string, apiUrl?: string, apiModel?: string) {
    if (apiKey !== undefined) this.apiKey = apiKey
    if (apiUrl !== undefined) this.apiUrl = apiUrl
    if (apiModel !== undefined) this.defaultModel = apiModel

    console.log('✅ AI Client configuration updated:', {
      hasApiKey: !!this.apiKey,
      apiUrl: this.apiUrl,
      model: this.defaultModel,
    })
  }

  /**
   * 获取当前配置状态
   */
  getConfig() {
    return {
      hasApiKey: !!this.apiKey,
      apiUrl: this.apiUrl,
      defaultModel: this.defaultModel,
    }
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.apiUrl
  }

  /**
   * 发送聊天请求
   * @param messages - 消息数组
   * @param options - 请求选项
   * @returns AI 响应
   */
  async chat(messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> {
    // 检查配置
    if (!this.isConfigured()) {
      throw new Error('AI Client is not configured. Please set API key and URL in settings.')
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens,
          top_p: options?.top_p ?? 0.9,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `SiliconFlow API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`,
        )
      }

      const data = await response.json()

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      }
    } catch (error) {
      console.error('❌ SiliconFlow API request failed:', error)
      throw error
    }
  }

  /**
   * 发送简单的单次请求
   * @param systemPrompt - 系统提示词
   * @param userMessage - 用户消息
   * @param options - 请求选项
   * @returns AI 响应内容
   */
  async simpleChat(
    systemPrompt: string,
    userMessage: string,
    options?: AIRequestOptions,
  ): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const response = await this.chat(messages, options)
    return response.content
  }

  /**
   * 测试 API 连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.simpleChat('You are a helpful assistant.', 'Say "Hello"', {
        max_tokens: 10,
      })
      return true
    } catch (error) {
      console.error('❌ SiliconFlow API connection test failed:', error)
      return false
    }
  }
}

// 导出默认实例
export const aiClient = new SiliconFlowClient()
