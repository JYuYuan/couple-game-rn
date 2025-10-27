import type { AvatarGender, PlayerProfile } from '@/types/settings'

// 基础玩家类型
export interface BasePlayer {
  id: number | string
  name: string
  avatarId: string
  gender: AvatarGender
}

// 本地游戏玩家类型
export interface LocalPlayer extends BasePlayer {
  id: number
  color: string
  position: number
  score: number
  completedTasks: string[]
  achievements: string[]
  isAI: boolean
}

// 网络玩家类型（基础网络玩家）
export interface NetworkPlayer extends BasePlayer {
  id: string
  socketId: string
  isHost: boolean
  isConnected: boolean
  playerId?: string // 兼容性字段
  color?: string // 游戏中的颜色
  position?: number // 游戏中的位置
  score?: number // 游戏分数
  roomId?: string | null // 房间ID（可选，用于某些场景）
  completedTasks?: string[] // 完成的任务
  achievements?: string[] // 成就
  lastSeen?: number // 最后活跃时间
  lastActivity?: number // 最后活动时间
  joinedAt?: number // 加入时间
  isAI?: boolean // 是否为AI玩家
}

// 在线玩家类型
export interface OnlinePlayer extends NetworkPlayer {
  roomId: string
  joinedAt: number
  lastSeen: number
}

// 局域网玩家类型
export interface LANPlayer extends NetworkPlayer {
  ipAddress: string
  port: number
}

// 转盘游戏玩家类型
export interface WheelPlayer extends LocalPlayer {
  // 转盘游戏特有的属性可以在这里添加
}

// 游戏玩家类型（别名）
export type GamePlayer = LocalPlayer

// 服务端玩家类型
export interface ServerPlayer extends OnlinePlayer {
  color: string
  position: number
  score: number
  completedTasks: string[]
  achievements: string[]
  isAI?: boolean
}

// 玩家信息类型
export interface PlayerInfo {
  name: string
  isHost?: boolean
  avatar?: string
  gender?: AvatarGender
}

// 重新导出 PlayerProfile 以保持兼容性
export type { PlayerProfile }

// 游戏相关数据类型
export interface PlayerMoveData {
  playerId: string
  fromPosition: number
  toPosition: number
  timestamp: number
}

export interface DiceRollData {
  playerId: string
  diceValue: number
  timestamp: number
}

export interface DiceRollResult {
  playerId: string
  diceValue: number
  canMove: boolean
  newPosition?: number
  success?: boolean
  error?: string
}

export interface GameVictoryData {
  winnerId: string
  winnerName: string
  gameTime: number
  totalMoves: number
}

// 常量定义
export const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']



// 类型守卫函数
export function isLocalPlayer(player: any): player is LocalPlayer {
  return typeof player.id === 'number' && 
         typeof player.position === 'number' && 
         typeof player.score === 'number'
}

export function isNetworkPlayer(player: any): player is NetworkPlayer {
  return typeof player.id === 'string' && 
         typeof player.socketId === 'string'
}

export function isOnlinePlayer(player: any): player is OnlinePlayer {
  return isNetworkPlayer(player) && 
         'roomId' in player &&
         typeof player.roomId === 'string'
}

// 转换工具函数
export function localPlayerToNetworkPlayer(localPlayer: LocalPlayer): NetworkPlayer {
  return {
    id: localPlayer.id.toString(),
    name: localPlayer.name,
    avatarId: localPlayer.avatarId,
    gender: localPlayer.gender,
    socketId: '',
    isHost: false,
    isConnected: true,
    playerId: localPlayer.id.toString()
  }
}

export function networkPlayerToLocalPlayer(networkPlayer: NetworkPlayer, index: number): LocalPlayer {
  return {
    id: index + 1,
    name: networkPlayer.name,
    avatarId: networkPlayer.avatarId,
    gender: networkPlayer.gender,
    color: PLAYER_COLORS[index] || PLAYER_COLORS[0],
    position: 0,
    score: 0,
    completedTasks: [],
    achievements: [],
    isAI: false
  }
}