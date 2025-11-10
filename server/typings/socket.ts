import type { Server, Socket } from 'socket.io'
import type { TaskSet } from './tasks'
import type { TaskModalData } from './room'

// 导入PathCell类型
interface PathCell {
  id: number
  x: number
  y: number
  type: 'start' | 'end' | 'path' | 'star' | 'trap'
  direction: 'right' | 'down' | 'left' | 'up' | null
}

export type SocketIOServer = Server
export type SocketIOSocket = Socket

export interface PlayerInfo {
  name: string
  isHost?: boolean
  avatarId?: string
  gender?: 'man' | 'woman'
}

export interface RoomInfo {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
  avatarId?: string
  gender?: 'man' | 'woman'
}

export interface JoinData {
  roomId: string
  playerName: string
  avatarId?: string
  gender?: 'man' | 'woman'
}

export interface GameAction {
  type: string
  roomId: string
  [key: string]: unknown
}

export interface SocketCallback {
  (response?: unknown): void
}

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

export interface Room {
  id: string
  name: string
  hostId: string
  players: Player[]
  maxPlayers: number
  gameStatus: 'waiting' | 'playing' | 'ended'
  gameType: 'fly' | 'wheel' | 'minesweeper'
  createdAt: number
  lastActivity: number
  engine: unknown
  currentUser?: string
  boardPath?: PathCell[]
  // 统一的游戏状态对象
  gameState?: {
    playerPositions: { [playerId: string]: number }
    turnCount: number
    gamePhase: string
    startTime: number
    lastDiceRoll?: {
      playerId: string
      playerName: string
      diceValue: number
      timestamp: number
    }
    currentTask?: TaskModalData
    boardSize: number
    [key: string]: unknown
  }
  taskSet?: TaskSet
  tasks?: string[] // 当前游戏中的任务列表
  [key: string]: unknown
}

export interface GameData {
  roomId: string
  [key: string]: unknown
}
