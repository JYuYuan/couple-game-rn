import { GamePlayer } from '@/hooks/use-game-players'
import { TaskSet } from '@/types/tasks'
import { PathCell } from '@/types/game'

// 网络游戏玩家接口（扩展基础 GamePlayer，使用 string 类型的 ID）
export interface NetworkPlayer extends Omit<GamePlayer, 'id'> {
  id: string // 网络模式使用 string ID
  isHost: boolean
  isConnected: boolean
  joinedAt?: Date // 在线模式特有
  lastSeen?: Date // 在线模式特有
  socketId?: string // 在线模式的 socket ID
}

// 在线玩家接口
export interface OnlinePlayer extends NetworkPlayer {
  socketId: string // 在线模式必须有 socketId
  joinedAt: Date
  lastSeen: Date
}

// 房间状态
export type RoomStatus = 'waiting' | 'playing' | 'paused' | 'ended'

// 连接类型
export type ConnectionType = 'online' | 'lan'

// WebRTC 连接状态
export type WebRTCConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed'

// 基础房间接口（通用结构）
export interface BaseRoom {
  id: string
  name: string
  hostId: string // 统一使用 hostId，在线模式是 socketId，局域网模式是 peerId
  players: NetworkPlayer[] // 使用网络玩家类型
  diceValue: number
  boardPath: PathCell[]
  maxPlayers: number
  gameStatus: RoomStatus
  currentUser: string
  taskSetId: string
  gameType: 'fly' | 'wheel' | 'minesweeper'
  createdAt: Date
  lastActivity: Date
  taskSet: TaskSet
  gameData?: {
    diceValue?: number
    boardPath?: any[]
    currentTasks?: any[]
  }
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

// Socket事件类型
export interface SocketEvents {
  // 房间管理
  'room:create': (data: CreateRoomData) => void
  'room:join': (data: JoinRoomData) => void
  'room:leave': (data: LeaveRoomData) => void
  'room:update': (room: OnlineRoom) => void

  // 游戏事件
  'game:start': (data: GameStartData) => void
  'game:dice-roll': (data: DiceRollData) => void
  'game:player-move': (data: PlayerMoveData) => void
  'game:task-trigger': (data: TaskTriggerData) => void
  'game:task-complete': (data: TaskCompleteData) => void
  'game:victory': (data: GameVictoryData) => void

  // 连接事件
  'player:connected': (player: OnlinePlayer) => void
  'player:disconnected': (playerId: string) => void
  error: (error: SocketError) => void
}

// 创建房间数据
export interface CreateRoomData {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
}

// 加入房间数据
export interface JoinRoomData {
  roomId: string
  playerName: string
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
  diceValue: number
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
  hostIP: string
  roomId: string
  networkPassword?: string
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
