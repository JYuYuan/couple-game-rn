import { LANRoom, LANRoomDiscovery } from '@/types/online'
import { NetworkInfo } from 'react-native-network-info'

// 房间发现服务
export class RoomDiscoveryService {
  private static instance: RoomDiscoveryService
  private discoveryInterval: any = null
  private broadcastInterval: any = null
  private listeners: Map<string, Set<Function>> = new Map()
  private discoveredRooms: Map<string, LANRoomDiscovery> = new Map()
  private currentRoom: LANRoom | null = null

  private constructor() {}

  static getInstance(): RoomDiscoveryService {
    if (!RoomDiscoveryService.instance) {
      RoomDiscoveryService.instance = new RoomDiscoveryService()
    }
    return RoomDiscoveryService.instance
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

  // 开始房间发现
  async startDiscovery(): Promise<void> {
    try {
      console.log('开始局域网房间发现...')

      // 获取网络信息
      const networkInfo = await this.getLocalNetworkInfo()
      if (!networkInfo.ip) {
        throw new Error('无法获取本地IP地址')
      }

      // 清理之前的发现结果
      this.discoveredRooms.clear()

      // 开始周期性发现 - 通过 Socket.IO 查询服务器上的房间
      this.discoveryInterval = setInterval(() => {
        this.discoverRooms()
      }, 3000)

      // 立即执行一次发现
      this.discoverRooms()

      this.emit('discoveryStarted')
    } catch (error) {
      console.error('启动房间发现失败:', error)
      throw error
    }
  }

  // 停止房间发现
  stopDiscovery(): void {
    console.log('停止局域网房间发现...')

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }

    this.discoveredRooms.clear()
    this.emit('discoveryStopped')
  }

  // 开始广播房间信息
  startBroadcast(room: LANRoom): void {
    console.log('开始广播房间信息:', room.id)

    this.currentRoom = room

    // 停止之前的广播
    this.stopBroadcast()

    // 开始周期性广播 - 通过 Socket.IO 向服务器注册房间
    this.broadcastInterval = setInterval(() => {
      this.broadcastRoom()
    }, 2000)

    // 立即广播一次
    this.broadcastRoom()
  }

  // 停止广播房间信息
  stopBroadcast(): void {
    console.log('停止广播房间信息...')

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }

    // 从服务器移除房间
    if (this.currentRoom) {
      this.unregisterRoom(this.currentRoom.id)
    }

    this.currentRoom = null
  }

  // 获取发现的房间列表
  getDiscoveredRooms(): LANRoomDiscovery[] {
    return Array.from(this.discoveredRooms.values())
  }

  // 发现房间 - 通过 Socket.IO 从服务器获取
  private async discoverRooms(): Promise<void> {
    try {
      console.log('正在扫描局域网房间...')

      // 通过 Socket.IO 获取局域网房间列表
      const socketService = this.getSocketService()
      if (socketService && socketService.getIsConnected()) {
        // 发送房间列表请求
        socketService.socketEmit('lan:discover')
      }

      // 清理过期的房间（超过10秒没有更新的房间）
      const now = Date.now()
      const expiredRooms: string[] = []

      this.discoveredRooms.forEach((room, roomId) => {
        if (now - room.timestamp > 10000) {
          expiredRooms.push(roomId)
        }
      })

      expiredRooms.forEach((roomId) => {
        this.discoveredRooms.delete(roomId)
        this.emit('roomLost', roomId)
      })

      this.emit('roomsUpdated', this.getDiscoveredRooms())
    } catch (error) {
      console.error('房间发现失败:', error)
    }
  }

  // 广播房间信息 - 通过 Socket.IO 注册到服务器
  private async broadcastRoom(): Promise<void> {
    if (!this.currentRoom) return

    try {
      // 创建广播数据
      const broadcastData: LANRoomDiscovery = {
        roomId: this.currentRoom.id,
        roomName: this.currentRoom.name,
        hostPeerId: this.currentRoom.hostId,
        hostIP: this.currentRoom.networkInfo.hostIP,
        hostName: 'Host', // 实际应该获取设备名称
        maxPlayers: this.currentRoom.maxPlayers,
        currentPlayers: this.currentRoom.players.length,
        gameType: this.currentRoom.gameType,
        requiresPassword: false,
        timestamp: Date.now(),
      }

      console.log('广播房间信息:', broadcastData)

      // 通过 Socket.IO 注册房间到服务器
      const socketService = this.getSocketService()
      if (socketService && socketService.getIsConnected()) {
        socketService.socketEmit('lan:register', broadcastData)
      }
    } catch (error) {
      console.error('广播房间信息失败:', error)
    }
  }

  // 从服务器移除房间
  private async unregisterRoom(roomId: string): Promise<void> {
    try {
      const socketService = this.getSocketService()
      if (socketService && socketService.getIsConnected()) {
        socketService.socketEmit('lan:unregister', { roomId })
      }
    } catch (error) {
      console.error('移除房间失败:', error)
    }
  }

  // 获取 SocketService 实例
  private getSocketService(): any {
    try {
      return require('./socket-service').socketService
    } catch (error) {
      console.error('获取 SocketService 失败:', error)
      return null
    }
  }

  // 处理服务器返回的房间列表
  handleRoomList(rooms: LANRoomDiscovery[]): void {
    console.log('收到房间列表:', rooms.length, '个房间')

    // 更新房间列表
    this.discoveredRooms.clear()
    rooms.forEach((room) => {
      this.discoveredRooms.set(room.roomId, room)
      this.emit('roomDiscovered', room)
    })

    this.emit('roomsUpdated', this.getDiscoveredRooms())
  }

  // 模拟收到房间广播（用于测试）
  simulateRoomBroadcast(roomData: LANRoomDiscovery): void {
    console.log('收到房间广播:', roomData)

    // 更新房间信息
    this.discoveredRooms.set(roomData.roomId, roomData)

    // 通知房间发现
    this.emit('roomDiscovered', roomData)
    this.emit('roomsUpdated', this.getDiscoveredRooms())
  }

  // 获取本地网络信息
  async getLocalNetworkInfo(): Promise<{ ip: string; ssid?: string }> {
    try {
      const ip = await NetworkInfo.getIPAddress()
      const ssid = await NetworkInfo.getSSID()

      return {
        ip: ip || '192.168.1.100',
        ssid: ssid || undefined,
      }
    } catch (error) {
      console.error('获取网络信息失败:', error)
      return {
        ip: '192.168.1.100',
      }
    }
  }

  // 检查网络连接状态
  async checkNetworkStatus(): Promise<{ isConnected: boolean; isWiFi: boolean; ssid?: string }> {
    try {
      const ip = await NetworkInfo.getIPAddress()
      const ssid = await NetworkInfo.getSSID()

      return {
        isConnected: !!ip,
        isWiFi: !!ssid,
        ssid: ssid || undefined,
      }
    } catch (error) {
      console.error('检查网络状态失败:', error)
      return {
        isConnected: false,
        isWiFi: false,
      }
    }
  }
}

export const roomDiscoveryService = RoomDiscoveryService.getInstance()
