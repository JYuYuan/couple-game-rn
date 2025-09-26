import { io, Socket } from 'socket.io-client'
import {
  CreateRoomData,
  DiceRollData,
  GameStartData,
  JoinRoomData,
  OnlineRoom,
  PlayerMoveData,
  SocketError,
  TaskCompleteData,
} from '@/types/online'

const SOCKET_URL = __DEV__ ? 'http://localhost:3001' : 'https://your-production-server.com'

// 单例 Socket 服务
class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private currentRoom: OnlineRoom | null = null
  private isConnected: boolean = false
  private connectionError: string | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  // 获取状态
  getCurrentRoom(): OnlineRoom | null {
    return this.currentRoom
  }

  getIsConnected(): boolean {
    return this.isConnected
  }

  getConnectionError(): string | null {
    return this.connectionError
  }

  getSocket(): Socket | null {
    return this.socket
  }

  // 事件管理
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
    }
  }

  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(...args))
    }
  }

  // 连接管理
  connect(playerId: string): void {
    if (this.socket?.connected) {
      console.log('SocketService: Already connected:', this.socket.id)
      return
    }

    console.log('SocketService: Creating new connection to:', SOCKET_URL)
    this.socket = io(SOCKET_URL, {
      timeout: 10000,
      retries: 3,
      forceNew: true,
      transports: ['websocket', 'polling'],
      query: {
        playerId: playerId,
      },
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      this.isConnected = true
      this.connectionError = null
      this.emit('connect')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('SocketService: Disconnected:', reason)
      this.isConnected = false
      this.emit('disconnect', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error)
      this.isConnected = false
      this.connectionError = `连接失败: ${error.message}`
      this.emit('connect_error', error)
    })

    this.socket.on('room:update', (room: OnlineRoom) => {
      console.log('SocketService: Room updated:', room)
      this.setCurrentRoom(room, 'room:update event')
    })

    this.socket.on('error', (error: SocketError) => {
      console.error('SocketService: Socket error:', error)
      this.connectionError = error.message
      this.emit('error', error)
    })

    // 添加通用事件监听器用于调试
    this.socket.onAny((eventName, ...args) => {
      console.log(`SocketService: Event received: ${eventName}`, args)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.setCurrentRoom(null, 'disconnect')
    }
  }

  // 房间管理
  setCurrentRoom(room: OnlineRoom | null, source: string): void {
    console.log(`SocketService: Room changed from ${source}:`, {
      from: this.currentRoom?.id || 'null',
      to: room?.id || 'null',
    })
    this.currentRoom = room
    this.emit('currentRoomChanged', room)
  }

  // Socket 操作
  socketEmit(event: string, ...args: any[]): void {
    if (this.socket) {
      this.socket.emit(event, ...args)
      console.log(`[SocketService] Event ${event} emitted successfully`)
    } else {
      console.error(`[SocketService] Cannot emit ${event}: socket is null`)
    }
  }

  // 房间操作
  async createRoom(data: CreateRoomData): Promise<OnlineRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket未连接'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('创建房间超时'))
      }, 15000)

      this.socket.emit(
        'room:create',
        data,
        (response: { success: boolean; room?: OnlineRoom; error?: string }) => {
          console.log(response)
          clearTimeout(timeout)
          if (response.success && response.room) {
            this.setCurrentRoom(response.room, 'createRoom callback')
            resolve(response.room)
          } else {
            reject(new Error(response.error || '创建房间失败'))
          }
        },
      )
    })
  }

  async joinRoom(data: JoinRoomData): Promise<OnlineRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket未连接'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('加入房间超时'))
      }, 10000)

      this.socket.emit(
        'room:join',
        data,
        (response: { success: boolean; room?: OnlineRoom; error?: string }) => {
          clearTimeout(timeout)
          if (response.success && response.room) {
            this.setCurrentRoom(response.room, 'joinRoom callback')
            resolve(response.room)
          } else {
            reject(new Error(response.error || '加入房间失败'))
          }
        },
      )
    })
  }

  leaveRoom(): void {
    if (this.socket && this.currentRoom) {
      console.log('SocketService: Leaving room:', this.currentRoom.id)
      this.socket.emit('room:leave', { roomId: this.currentRoom.id })
      this.setCurrentRoom(null, 'leaveRoom')
    }
  }

  resetRoomState(): void {
    console.log('SocketService: Resetting room state')
    this.setCurrentRoom(null, 'resetRoomState')
    this.connectionError = null
  }

  // 游戏事件
  startGame(data: GameStartData): void {
    this.socketEmit('game:start', data)
  }

  rollDice(data: DiceRollData): void {
    this.runActions('roll_dice', data)
  }

  movePlayer(data: PlayerMoveData): void {
    this.runActions('move_piece', data)
  }

  completeTask(data: TaskCompleteData): void {
    this.socketEmit('complete_task', data)
  }

  runActions(type: string, data: any): void {
    this.socketEmit('game:actions', { type, ...data })
  }

  // 便利属性
  isHost(playerId: string): boolean {
    return this.currentRoom ? playerId === this.currentRoom.hostId : false
  }

  getCurrentPlayer() {
    this.on('game:state', (data: any) => {
      console.log(data)
    })
  }
}

export const socketService = SocketService.getInstance()
