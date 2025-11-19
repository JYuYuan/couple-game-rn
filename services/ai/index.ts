/**
 * AI Services Entry Point
 * AI 服务统一导出
 */

// Client
export { SiliconFlowClient, aiClient } from './client'

// Prompts
export {
  GAME_ROLE_PROMPTS,
  getGameSystemPrompt,
  getGameRolePrompt,
  getSupportedGameTypes,
  type GameRolePrompt,
} from './prompts'

// Services
export { DrawGuessWordService, drawGuessWordService } from './draw-guess-service'
export {
  GameModeTaskService,
  gameModeTaskService,
  type TaskGenerationOptions,
} from './game-mode-service'

// Types
export type {
  AIMessage,
  AIRequestOptions,
  AIResponse,
  GameType,
  WordGenerationOptions,
  GeneratedWord,
} from '../types'
