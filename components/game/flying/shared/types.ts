/**
 * Flying Chess 游戏共享类型定义
 */

import { GamePlayer } from '@/hooks/use-game-players'
import { OnlinePlayer, TaskModalData } from '@/types/online'
import { PathCell } from '@/types/game'

// 统一的玩家类型
export type Player = GamePlayer | OnlinePlayer

// 游戏模式
export type GameMode = 'offline' | 'online'

// 游戏状态
export type GameStatus = 'waiting' | 'playing' | 'ended' | 'paused'

// 任务类型
export type TaskType = 'trap' | 'star' | 'collision'

// GameCore Props接口
export interface GameCoreProps {
  // 基础信息
  mode: GameMode
  gameStatus: GameStatus

  // 玩家数据
  players: Player[]
  currentPlayer: Player | null
  currentPlayerIndex: number
  currentPlayerId?: string // 🐾 当前玩家ID,用于任务模态框判断执行者

  // 棋盘数据
  boardPath: PathCell[]

  // 骰子状态
  diceValue: number
  isRolling: boolean
  isMoving: boolean

  // 任务状态
  showTaskModal: boolean
  taskModalData: TaskModalData | null

  // 胜利状态
  showVictoryModal: boolean
  winner: Player | null

  // 事件回调
  onDiceRoll: () => void
  onTaskComplete: (completed: boolean) => void
  onResetGame: () => void
  onExit: () => void

  // UI相关
  colors: any
  t: any // 改为any以支持不同的翻译函数类型

  // 可选的模式特定数据
  isOwnTurn?: boolean // online模式专用
  isHost?: boolean // online模式专用
}

// 游戏逻辑Hook返回值
export interface GameLogic {
  // 胜利检查
  checkAndHandleVictory: (playerId: string, finalPosition: number) => boolean
  handleVictory: (player: Player) => void

  // 任务处理
  checkCellAndTriggerTask: (playerId: string, position: number) => boolean
  triggerTask: (taskType: TaskType, playerId: string) => void

  // 移动逻辑
  movePlayerStepByStep: (
    playerId: string,
    steps: number,
    isForward: boolean,
    onComplete?: (playerId: number, finalPosition: number) => void,
  ) => void
}
