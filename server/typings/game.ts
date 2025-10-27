export interface PathCell {
  id: number
  x: number
  y: number
  type: 'start' | 'end' | 'star' | 'trap' | 'path'
  direction: 'right' | 'down' | 'left' | 'up' | null
}

// 使用统一的 Player 类型定义
export interface Player {
  id: string
  socketId: string
  name: string
  roomId: string | null
  color: string
  isHost: boolean
  avatarId: string
  gender?: 'man' | 'woman'
  isConnected: boolean
  joinedAt: number
  lastSeen: number
  position: number
  score: number
  playerId: string // 兼容性字段
  completedTasks: string[]
  achievements: string[]
  isAI?: boolean
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'ended'
  mode: 'single' | 'multi'
  currentPlayer: number
  players: Player[]
  board: PathCell[]
  diceValue: number
  round: number
  timeLeft: number
}
