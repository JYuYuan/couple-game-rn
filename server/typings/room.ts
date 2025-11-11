import type { TaskSet } from './tasks'
import type { Player } from './socket'

export interface CreateRoomData {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
}

// 🐾 执行者任务信息（每个执行者有独立的任务）
export interface ExecutorTask {
  executor: Player // 执行者信息
  task: {
    title: string // 任务标题
    description?: string // 任务描述
  }
  completed: boolean // 是否已完成
  result?: {
    // 完成结果（如果已完成）
    completed: boolean // 成功/失败
    content: number // 位置变化（正数=前进，负数=后退，0=回到起点）
    timestamp: number // 完成时间戳
  }
}

export interface TaskModalData {
  id: string // 任务集ID
  type: 'trap' | 'star' | 'collision'
  category: string
  difficulty: string
  triggerPlayerIds: number[] // 触发玩家ID数组
  executorTasks: ExecutorTask[] // 执行者任务列表（每个执行者有独立的任务）
}
