/**
 * AI Service Types
 * 定义 AI 服务相关的类型
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIRequestOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
}

export interface AIResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export type GameType =
  | 'draw-guess' // 你画我猜
  | 'minesweeper' // 扫雷
  | 'minesweeper-battle' // 扫雷对战
  | 'flying-chess' // 飞行棋
  | 'wheel-points' // 转盘积分

export interface WordGenerationOptions {
  difficulty?: 'easy' | 'medium' | 'hard'
  category?: string
  count?: number
  language?: 'zh' | 'en' | 'ja'
}

export interface GeneratedWord {
  word: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  hints?: string[]
}
