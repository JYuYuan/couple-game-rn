import { GamePlayer } from '@/hooks/use-game-players'
import { TaskSet } from '@/types/tasks'
import { PathCell } from '@/types/game'

// 服务端TaskModalData接口（从服务端同步）
export interface TaskModalData {
  id: string
  title: string
  description: string
  type: 'trap' | 'star' | 'collision'
  executors: {
    id: any
    name: string
    color: string
    iconType: number
    [key: string]: any
  }[]
  category: string
  difficulty: string
  triggerPlayerIds: number[]
  isExecutor?: boolean // 当前玩家是否为执行者
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

  [key: string]: any
}

// 网络游戏玩家接口（扩展基础 GamePlayer，使用 string 类型的 ID）
export interface NetworkPlayer extends Omit<GamePlayer, 'id'> {
  id: string // 网络模式使用 string ID
  roomId: string | null // 所在房间ID
  playerId: string // 玩家唯一标识符
  isHost: boolean
  isConnected: boolean
  joinedAt: number // 统一使用时间戳
  lastSeen: number // 统一使用时间戳
  lastActivity?: number // 最后活跃时间
  socketId?: string // 在线模式的 socket ID
  avatar?: string // 头像ID
  gender?: 'man' | 'woman' // 性别
}

// 在线玩家接口
export interface OnlinePlayer extends NetworkPlayer {
  socketId: string // 在线模式必须有 socketId
  joinedAt: number // 统一使用时间戳
  lastSeen: number // 统一使用时间戳
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
  engine?: any
  currentUser?: string
  boardPath?: PathCell[]
  // 统一的游戏状态对象（匹配服务端结构）
  gameState?: GameState
  taskSet?: TaskSet
  // 兼容性字段
  taskSetId?: string
  diceValue?: number // 保留用于向后兼容
  gameData?: {
    diceValue?: number
    boardPath?: any[]
    currentTasks?: any[]
  }

  [key: string]: any
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
  avatar?: string // 头像ID
  gender?: 'man' | 'woman' // 性别
}

// 加入房间数据
export interface JoinRoomData {
  roomId: string
  playerName: string
  avatar?: string // 头像ID
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

// 投掷骰子数据
export interface DiceRollData {
  roomId: string
  playerId: string
  diceValue?: number // 客户端发送请求时不需要diceValue，服务端返回时才有
}

// 投掷骰子回调结果类型
export interface DiceRollResult {
  success: boolean
  diceValue?: number
  playerId: string
  error?: string
}

// 玩家移动数据
export interface PlayerMoveData {
  roomId: string
  playerId: string
  fromPosition: number
  toPosition: number
  steps: number
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

// 游戏胜利数据
export interface GameVictoryData {
  roomId: string
  winnerId: string
  winnerName: string
}

// Socket错误
export interface SocketError {
  code: string
  message: string
  details?: any
}

// WebRTC 信令数据
export interface WebRTCSignalingData {
  type: 'offer' | 'answer' | 'ice-candidate'
  data: any
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
  maxPlayers: number
  currentPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  requiresPassword: boolean
  timestamp: number
}
