import type { TaskSet } from './tasks'

export interface CreateRoomData {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
}

export interface TaskModalData {
  id: string
  title: string
  description: string
  type: 'trap' | 'star' | 'collision'
  executors: {
    // 改为数组，支持多个执行者
    id: any
    name: string
    color: string
    iconType: number
    [key: string]: any
  }[]
  category: string
  difficulty: string
  triggerPlayerIds: number[] // 改为数组，支持多个触发者
}
