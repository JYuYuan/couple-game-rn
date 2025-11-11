import { Task, TaskSet } from '@/types/tasks'
import { PathCell } from '@/types/game'
import {
  NetworkPlayer,
  OnlinePlayer,
  LocalPlayer as GamePlayer,
  PlayerMoveData,
  DiceRollData,
  DiceRollResult,
  GameVictoryData,
} from '@/types/player'

// 重新导出类型以供其他模块使用
export {
  NetworkPlayer,
  OnlinePlayer,
  GamePlayer,
  PlayerMoveData,
  DiceRollData,
  DiceRollResult,
  GameVictoryData,
}

// 🐾 执行者任务信息（每个执行者有独立的任务）
export interface ExecutorTask {
  executor: GamePlayer // 执行者信息
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

// 🐾 离线模式任务数据（旧格式，用于离线模式）
export interface OfflineTaskModalData {
  id: string
  title: string // 任务标题
  description?: string // 任务描述
  type: 'trap' | 'star' | 'collision'
  category: string
  difficulty: string
  triggerPlayerIds: string[]
  executors: GamePlayer[] // 执行者列表（旧格式）
  isExecutor?: boolean // 可选：标记当前玩家是否是执行者
}

// 服务端TaskModalData接口（从服务端同步，用于在线模式）
export interface TaskModalData {
  id: string // 任务集ID
  type: 'trap' | 'star' | 'collision'
  category: string
  difficulty: string
  triggerPlayerIds: string[]
  executorTasks: ExecutorTask[] // 执行者任务列表（每个执行者有独立的任务）
}

// 游戏状态接口（匹配服务端结构）
export interface GameState {
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
  winner?: {
    winnerId: string
    winnerName: string
    endTime: number
    finalPositions: [string, number][]
  }

  [key: string]: unknown
}

// 房间状态
export type RoomStatus = 'waiting' | 'playing' | 'paused' | 'ended'

// 连接类型
export type ConnectionType = 'online' | 'lan'

// WebRTC 连接状态
export type WebRTCConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed'

// 基础房间接口（通用结构，匹配服务端）
export interface BaseRoom {
  id: string
  name: string
  hostId: string
  players: NetworkPlayer[]
  maxPlayers: number
  gameStatus: 'waiting' | 'playing' | 'ended'
  gameType: 'fly' | 'wheel' | 'minesweeper'
  createdAt: number
  lastActivity: number
  engine?: unknown
  currentUser?: string
  boardPath?: PathCell[]
  // 统一的游戏状态对象（匹配服务端结构）
  gameState?: GameState
  taskSet?: TaskSet
  tasks: (string | Task)[] // 🐾 当前可用的任务列表（可以是字符串或 Task 对象）
  // 兼容性字段
  taskSetId?: string
  diceValue?: number // 保留用于向后兼容
  gameData?: {
    diceValue?: number
    boardPath?: unknown[]
    currentTasks?: unknown[]
  }

  [key: string]: unknown
}

// 在线房间接口（继承基础房间，添加在线特有属性）
export interface OnlineRoom extends BaseRoom {
  connectionType: 'online'
  // 在线房间特有的属性可以在这里添加
}

// 局域网房间接口（继承基础房间，添加局域网特有属性）
export interface LANRoom extends BaseRoom {
  connectionType: 'lan'
  networkInfo: {
    hostIP: string
    port?: number
    ssid?: string // WiFi 网络名称
  }
  // 局域网房间特有的属性可以在这里添加
}

// 创建房间数据
export interface CreateRoomData {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
  avatarId?: string // 头像ID
  gender?: 'man' | 'woman' // 性别
}

// 加入房间数据
export interface JoinRoomData {
  roomId: string
  playerName: string
  avatarId?: string // 头像ID
  gender?: 'man' | 'woman' // 性别
}

// 离开房间数据
export interface LeaveRoomData {
  roomId: string
  playerId: string
}

// 游戏开始数据
export interface GameStartData {
  roomId: string
}

// 任务触发数据
export interface TaskTriggerData {
  roomId: string
  taskType: 'trap' | 'star' | 'collision'
  triggerPlayerId: string
  executorPlayerId: string
  task: {
    id: string
    title: string
    description: string
    category: string
    difficulty: string
  }
}

// 任务完成数据
export interface TaskCompleteData {
  roomId: string
  taskId: string
  playerId: string
  completed: boolean
  rewardSteps?: number
}

// Socket错误
export interface SocketError {
  code: string
  message: string
  details?: unknown
}

// WebRTC 信令数据
export interface WebRTCSignalingData {
  type: 'offer' | 'answer' | 'ice-candidate'
  data: unknown
  fromPeerId: string
  toPeerId: string
  roomId: string
}

// 局域网房间创建数据
export interface CreateLANRoomData extends Omit<CreateRoomData, 'roomName'> {
  roomName: string
  networkPassword?: string // 可选的房间密码
}

// 局域网房间加入数据
export interface JoinLANRoomData extends Omit<JoinRoomData, 'roomId'> {
  roomId: string
  hostIP?: string // 可选,如果通过扫描加入则不需要
  hostPort?: number // 可选,默认 8080
  networkPassword?: string
  avatar?: string // 头像ID
  gender?: 'man' | 'woman' // 性别
  hostPlayerId?: string // 房主玩家ID(用于 WebRTC 模式)
}

// 房间发现数据
export interface LANRoomDiscovery {
  roomId: string
  roomName: string
  hostPeerId: string
  hostIP: string
  hostName: string
  tcpPort: number // TCP服务端口
  maxPlayers: number
  currentPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  requiresPassword: boolean
  timestamp: number
}
