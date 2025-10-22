import type { Server, Socket } from 'socket.io'
import type { TaskSet } from './tasks'
import type { TaskModalData } from './room'

export type SocketIOServer = Server
export type SocketIOSocket = Socket

export interface PlayerInfo {
  name: string
  isHost?: boolean
}

export interface RoomInfo {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
  avatar?: string
  gender?: 'man' | 'woman'
}

export interface JoinData {
  roomId: string
  playerName: string
  avatar?: string
  gender?: 'man' | 'woman'
}

export interface GameAction {
  type: string
  roomId: string
  [key: string]: any
}

export interface SocketCallback {
  (response?: any): void
}

export interface Player {
  id: string
  socketId: string
  name: string
  roomId: string | null
  color: string
  isHost: boolean
  avatar: string
  gender?: 'man' | 'woman'
  isConnected: boolean
  joinedAt: number
  lastSeen: number
  position: number // 统一为必需字段
  score: number // 统一为必需字段
  playerId?: string // 为了兼容性添加
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
  engine: any
  currentUser?: string
  boardPath?: any[]
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
    [key: string]: any
  }
  taskSet?: TaskSet
  [key: string]: any
}

export interface GameData {
  roomId: string
  [key: string]: any
}
