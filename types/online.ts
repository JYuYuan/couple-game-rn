import {GamePlayer} from '@/hooks/use-game-players';

// 在线玩家接口
export interface OnlinePlayer extends Omit<GamePlayer, 'id'> {
  id: string; // 使用string类型的socket ID
  socketId: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

// 房间状态
export type RoomStatus = 'waiting' | 'playing' | 'paused' | 'ended';

// 在线房间接口
export interface OnlineRoom {
  id: string;
  name: string;
  hostId: string;
  players: OnlinePlayer[];
  maxPlayers: number;
  gameStatus: RoomStatus;
  currentPlayerIndex: number;
  taskSetId: string;
  gameType: 'fly' | 'wheel' | 'minesweeper';
  createdAt: Date;
  lastActivity: Date;
  gameData?: {
    diceValue?: number;
    boardPath?: any[];
    currentTasks?: any[];
  };
}

// Socket事件类型
export interface SocketEvents {
  // 房间管理
  'room:create': (data: CreateRoomData) => void;
  'room:join': (data: JoinRoomData) => void;
  'room:leave': (data: LeaveRoomData) => void;
  'room:update': (room: OnlineRoom) => void;

  // 游戏事件
  'game:start': (data: GameStartData) => void;
  'game:dice-roll': (data: DiceRollData) => void;
  'game:player-move': (data: PlayerMoveData) => void;
  'game:task-trigger': (data: TaskTriggerData) => void;
  'game:task-complete': (data: TaskCompleteData) => void;
  'game:victory': (data: GameVictoryData) => void;

  // 连接事件
  'player:connected': (player: OnlinePlayer) => void;
  'player:disconnected': (playerId: string) => void;
  'error': (error: SocketError) => void;
}

// 创建房间数据
export interface CreateRoomData {
  roomName: string;
  playerName: string;
  maxPlayers: number;
  taskSetId: string;
  gameType: 'fly' | 'wheel' | 'minesweeper';
}

// 加入房间数据
export interface JoinRoomData {
  roomId: string;
  playerName: string;
}

// 离开房间数据
export interface LeaveRoomData {
  roomId: string;
  playerId: string;
}

// 游戏开始数据
export interface GameStartData {
  roomId: string;
}

// 投掷骰子数据
export interface DiceRollData {
  roomId: string;
  playerId: string;
  diceValue: number;
}

// 玩家移动数据
export interface PlayerMoveData {
  roomId: string;
  playerId: string;
  fromPosition: number;
  toPosition: number;
  steps: number;
}

// 任务触发数据
export interface TaskTriggerData {
  roomId: string;
  taskType: 'trap' | 'star' | 'collision';
  triggerPlayerId: string;
  executorPlayerId: string;
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
  };
}

// 任务完成数据
export interface TaskCompleteData {
  roomId: string;
  taskId: string;
  playerId: string;
  completed: boolean;
  rewardSteps?: number;
}

// 游戏胜利数据
export interface GameVictoryData {
  roomId: string;
  winnerId: string;
  winnerName: string;
}

// Socket错误
export interface SocketError {
  code: string;
  message: string;
  details?: any;
}

