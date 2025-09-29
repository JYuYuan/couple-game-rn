import { io, Socket } from 'socket.io-client'
import {
  CreateRoomData,
  DiceRollData,
  GameStartData,
  JoinRoomData,
  OnlineRoom,
  SocketError,
  TaskCompleteData,
} from '@/types/online'
import { showError } from '@/utils/toast'

const SOCKET_URL = __DEV__ ? 'http://localhost:3001' : 'https://your-production-server.com'

// 单例 Socket 服务
class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private currentRoom: OnlineRoom | null = null
  private isConnected: boolean = false
  private connectionError: string | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private connecting: boolean = false // 添加连接状态标识

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

    if (this.connecting) {
      console.log('SocketService: Connection already in progress, skipping...')
      return
    }

    // 如果已经有socket但是未连接，先清理
    if (this.socket && !this.socket.connected) {
      console.log('SocketService: Cleaning up existing disconnected socket')
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    console.log('SocketService: Creating new connection to:', SOCKET_URL, 'for player:', playerId)
    this.connecting = true // 设置连接状态

    this.socket = io(SOCKET_URL, {
      timeout: 10000,
      retries: 3,
      forceNew: false, // 改为 false，避免强制创建新连接
      transports: ['websocket', 'polling'],
      query: {
        playerId: playerId,
      },
    })

    // 添加连接ID日志，方便调试
    this.socket.on('connect', () => {
      console.log(
        `SocketService: Connected with socket ID: ${this.socket?.id} for player: ${playerId}`,
      )
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    // 清理之前的监听器，防止重复注册
    this.socket.removeAllListeners()

    this.socket.on('connect', () => {
      this.isConnected = true
      this.connectionError = null
      this.connecting = false // 重置连接状态
      this.emit('connect')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('SocketService: Disconnected:', reason)
      this.isConnected = false
      this.connecting = false // 重置连接状态
      this.emit('disconnect', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('SocketService: Connection error:', error)
      this.isConnected = false
      this.connecting = false // 重置连接状态
      this.connectionError = `连接失败: ${error.message}`
      // 使用Toast显示连接错误
      showError('连接失败', error.message || '无法连接到服务器')
      this.emit('connect_error', error)
    })

    this.socket.on('room:update', (room: OnlineRoom) => {
      console.log('SocketService: Room updated:', room)
      this.setCurrentRoom(room, 'room:update event')
    })

    this.socket.on('error', (error: SocketError) => {
      console.error('SocketService: Socket error:', error)
      this.connectionError = error.message
      // 使用Toast显示错误信息
      showError('连接错误', error.message)
      this.emit('error', error)
    })

    // 游戏相关事件转发
    this.socket.on('game:dice', (data) => {
      console.log('SocketService: Forwarding game:dice event')
      this.emit('game:dice', data)
    })

    this.socket.on('game:task', (data) => {
      console.log('SocketService: Forwarding game:task event')
      this.emit('game:task', data)
    })

    this.socket.on('game:victory', (data) => {
      console.log('SocketService: Forwarding game:victory event')
      this.emit('game:victory', data)
    })

    this.socket.on('game:move', (data) => {
      console.log('SocketService: Forwarding game:move event')
      this.emit('game:move', data)
    })

    this.socket.on('game:next', (data) => {
      console.log('SocketService: Forwarding game:next event')
      this.emit('game:next', data)
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
      this.connecting = false // 重置连接状态
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
    if (this.socket && this.socket.connected) {
      console.log(`[SocketService] Emitting ${event} with socket ID: ${this.socket.id}`, args)
      this.socket.emit(event, ...args)
      console.log(`[SocketService] Event ${event} emitted successfully`)
    } else {
      const reason = !this.socket ? 'socket is null' : 'socket not connected'
      console.error(`[SocketService] Cannot emit ${event}: ${reason}`)
      console.log(
        `[SocketService] Connection status: connected=${this.socket?.connected}, id=${this.socket?.id}`,
      )
    }
  }

  // 房间操作
  async createRoom(data: CreateRoomData): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      const errorMsg = 'Socket未连接'
      showError('创建房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    this.socket.emit('room:create', data)
  }

  async joinRoom(data: JoinRoomData): Promise<void> {
    if (!this.socket) {
      const errorMsg = 'Socket未连接'
      showError('加入房间失败', errorMsg)
      throw new Error(errorMsg)
    }

    this.socket.emit('room:join', data)
  }

  leaveRoom(): void {
    console.log(this.socket && this.currentRoom)
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

  completeTask(data: TaskCompleteData): void {
    this.socketEmit('complete_task', data)
  }

  runActions(type: string, data: any): void {
    console.log('游戏事件：', type, data)
    this.socketEmit('game:action', { type, ...data })
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
