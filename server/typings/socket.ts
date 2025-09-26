import type { Server, Socket } from 'socket.io'
import type { TaskSet } from './tasks'

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
}

export interface JoinData {
  roomId: string
  playerName: string
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
  iconType: string
  isConnected: boolean
  joinedAt: number
  lastSeen: number
  position?: number
  score?: number
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
  [key: string]: any
}

export interface GameData {
  roomId: string
  [key: string]: any
}