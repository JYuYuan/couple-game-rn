/**
 * LAN Service - 统一管理局域网连接
 * 集成 UDP 广播和 TCP 通信
 */

import { udpBroadcastService, RoomBroadcast } from './udp-broadcast'
import { tcpServer } from './tcp-server'
import { tcpClient } from './tcp-client'
import type { TCPMessage } from './tcp-server'
import { getLocalIP } from '@/utils'
import roomManager from '../game-managers/room-manager'
import playerManager from '../game-managers/player-manager'
import gameInstanceManager from '../game-managers/game-instance-manager'
import type {
  BaseRoom,
  CreateRoomData,
  JoinRoomData,
  GameStartData,
  DiceRollData,
  TaskCompleteData,
} from '@/types/online'

const DEFAULT_TCP_PORT = 8080 // 默认 TCP 端口

/**
 * LAN Service 类
 */
class LANService {
  private static instance: LANService
  private isHost: boolean = false
  private currentPlayerId: string = ''
  private currentRoom: BaseRoom | null = null
  private eventListeners: Map<string, Set<Function>> = new Map()
  private localIP: string = ''

  private constructor() {}

  static getInstance(): LANService {
    if (!LANService.instance) {
      LANService.instance = new LANService()
    }
    return LANService.instance
  }

  /**
   * 初始化 LAN 服务
   */
  async initialize(playerId: string): Promise<void> {
    this.currentPlayerId = playerId
    console.log('🌐 初始化 LAN 服务, PlayerId:', playerId)

    // 获取本地 IP
    const ip = await getLocalIP()
    if (!ip) {
      throw new Error('无法获取本地 IP 地址,请检查网络连接')
    }
    this.localIP = ip
    console.log('📍 本地 IP:', ip)
  }

  /**
   * 创建局域网房间(作为房主)
   */
  async createRoom(data: CreateRoomData, lanPort?: number): Promise<BaseRoom> {
    console.log('🏠 创建局域网房间...')

    // 确保已初始化
    if (!this.localIP) {
      await this.initialize(this.currentPlayerId)
    }

    // 标记为房主
    this.isHost = true

    // 使用配置的端口或默认端口
    const targetPort = lanPort || DEFAULT_TCP_PORT

    // 启动 TCP 服务器
    const tcpPort = await tcpServer.start(targetPort)
    console.log(`✅ TCP Server 启动: ${this.localIP}:${tcpPort}`)

    // 创建房间数据
    let player = await playerManager.getPlayer(this.currentPlayerId)
    if (!player) {
      player = await playerManager.addPlayer(this.currentPlayerId, {
        playerId: this.currentPlayerId,
        name: data.playerName,
        roomId: null,
        isHost: true,
        socketId: this.currentPlayerId,
        isConnected: true,
      })
    } else {
      player.name = data.playerName
      player.isHost = true
      await playerManager.updatePlayer(player)
    }

    // 创建房间
    let room = await roomManager.createRoom({
      name: data.roomName || `Room_${Date.now()}`,
      hostId: this.currentPlayerId,
      maxPlayers: data.maxPlayers || 2,
      gameType: data.gameType || 'fly',
      taskSet: data.taskSet || null,
    })

    // 将创建者加入房间
    const roomResult = await roomManager.addPlayerToRoom(room.id, player)
    if (!roomResult) {
      throw new Error('Failed to add player to room')
    }
    room = roomResult
    player.roomId = room.id
    await playerManager.updatePlayer(player)

    this.currentRoom = room

    // 设置 TCP Server 事件监听
    this.setupTCPServerEvents()

    // 开始 UDP 广播
    const broadcastData: RoomBroadcast = {
      roomId: room.id,
      roomName: room.name,
      hostName: player.name,
      hostIP: this.localIP,
      tcpPort: tcpPort,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.players.length,
      gameType: room.gameType,
      timestamp: Date.now(),
    }
    udpBroadcastService.startBroadcasting(broadcastData)

    console.log('✅ 局域网房间创建成功')
    console.log('📱 房间ID:', room.id)
    console.log('🌐 房主IP:', this.localIP)
    console.log('🔌 TCP端口:', tcpPort)

    // 触发房间更新事件
    this.emit('room:update', room)

    return room
  }

  /**
   * 加入局域网房间(作为客户端)
   */
  async joinRoom(hostIP: string, hostPort: number, data: JoinRoomData): Promise<BaseRoom> {
    console.log(`🔗 加入局域网房间: ${hostIP}:${hostPort}`)

    // 确保已初始化
    if (!this.localIP) {
      await this.initialize(this.currentPlayerId)
    }

    // 标记为非房主
    this.isHost = false

    // 设置 TCP Client 事件监听
    this.setupTCPClientEvents()

    // 连接到房主的 TCP 服务器
    await tcpClient.connect(hostIP, hostPort, this.currentPlayerId)
    console.log('✅ 连接到房主成功')

    // 发送加入房间请求
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('加入房间超时'))
      }, 10000)

      tcpClient.sendEvent('room:join', data, (response: any) => {
        clearTimeout(timeout)

        if (response.error) {
          reject(new Error(response.error))
        } else {
          this.currentRoom = response
          console.log('✅ 加入房间成功:', response)
          resolve(response)
        }
      })
    })
  }

  /**
   * 通过房间广播加入房间
   */
  async joinRoomByBroadcast(roomBroadcast: RoomBroadcast, data: JoinRoomData): Promise<BaseRoom> {
    return this.joinRoom(roomBroadcast.hostIP, roomBroadcast.tcpPort, data)
  }

  /**
   * 离开房间
   */
  async leaveRoom(): Promise<void> {
    console.log('👋 离开房间')

    if (this.isHost) {
      // 房主离开,关闭服务器
      udpBroadcastService.stopBroadcasting()
      tcpServer.stop()

      // 清理房间数据
      if (this.currentRoom) {
        await gameInstanceManager.removeGameInstance(this.currentRoom.id)
        await roomManager.deleteRoom(this.currentRoom.id)
      }
    } else {
      // 客户端离开,发送离开事件
      tcpClient.sendEvent('room:leave', {})
      tcpClient.disconnect()
    }

    // 清理玩家数据
    const player = await playerManager.getPlayer(this.currentPlayerId)
    if (player) {
      player.roomId = null
      await playerManager.updatePlayer(player)
    }

    this.currentRoom = null
    this.emit('room:left', {})
  }

  /**
   * 开始扫描局域网房间
   */
  startRoomScan(onRoomDiscovered?: (rooms: RoomBroadcast[]) => void): void {
    console.log('🔍 开始扫描局域网房间...')
    udpBroadcastService.startListening(onRoomDiscovered)
  }

  /**
   * 停止扫描
   */
  stopRoomScan(): void {
    console.log('🛑 停止扫描')
    udpBroadcastService.stopListening()
  }

  /**
   * 获取已发现的房间
   */
  getDiscoveredRooms(): RoomBroadcast[] {
    return udpBroadcastService.getDiscoveredRooms()
  }

  /**
   * 开始游戏
   */
  async startGame(data: GameStartData): Promise<void> {
    if (!this.isHost) {
      throw new Error('只有房主可以开始游戏')
    }

    if (!this.currentRoom) {
      throw new Error('当前不在任何房间中')
    }

    const room = await roomManager.getRoom(data.roomId)
    if (!room) {
      throw new Error('房间不存在')
    }

    if (room.players.length < 2) {
      throw new Error('至少需要2个玩家才能开始游戏')
    }

    // 创建游戏实例
    const mockIO = this.createMockIO()
    const game = await gameInstanceManager.createGameInstance(room, mockIO)

    if (!game) {
      throw new Error('游戏创建失败')
    }

    game.onStart()
  }

  /**
   * 游戏动作
   */
  async handleGameAction(data: DiceRollData | TaskCompleteData): Promise<any> {
    const roomId = (data as any).roomId

    if (this.isHost) {
      // 房主直接处理
      const mockIO = this.createMockIO()
      const game = await gameInstanceManager.getGameInstance(roomId, mockIO)

      if (!game) {
        throw new Error('游戏不存在')
      }

      let callbackResult: any = null
      const callback = (result: any) => {
        callbackResult = result
      }

      await game.onPlayerAction(mockIO, this.currentPlayerId, data, callback)
      await gameInstanceManager.updateGameInstance(roomId, game)

      return callbackResult
    } else {
      // 客户端发送到服务器
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('游戏动作超时'))
        }, 10000)

        tcpClient.sendEvent('game:action', data, (response: any) => {
          clearTimeout(timeout)

          if (response.error) {
            reject(new Error(response.error))
          } else {
            resolve(response)
          }
        })
      })
    }
  }

  /**
   * 设置 TCP Server 事件监听(房主)
   */
  private setupTCPServerEvents(): void {
    // 客户端连接
    tcpServer.on('client:connected', (data: any) => {
      console.log('👤 新客户端连接:', data.clientId)
    })

    // 客户端断开
    tcpServer.on('client:disconnected', async (data: any) => {
      console.log('👋 客户端断开:', data.playerId)

      // 从房间移除玩家
      if (this.currentRoom) {
        const updatedRoom = await roomManager.removePlayerFromRoom(this.currentRoom.id, data.playerId)
        if (updatedRoom) {
          this.currentRoom = updatedRoom

          // 广播房间更新
          tcpServer.broadcast({
            type: 'broadcast',
            event: 'room:update',
            data: updatedRoom,
          })

          // 更新 UDP 广播
          udpBroadcastService.updateRoomInfo({
            currentPlayers: updatedRoom.players.length,
          })

          // 触发本地事件
          this.emit('room:update', updatedRoom)
        }
      }
    })

    // 加入房间
    tcpServer.on('room:join', async (data: any) => {
      try {
        console.log('📨 处理加入房间请求:', data.playerId)

        if (!this.currentRoom) {
          throw new Error('房间不存在')
        }

        // 创建玩家
        let player = await playerManager.getPlayer(data.playerId)
        if (!player) {
          player = await playerManager.addPlayer(data.playerId, {
            playerId: data.playerId,
            name: data.data.playerName || `Player_${data.playerId.substring(0, 6)}`,
            roomId: this.currentRoom.id,
            isHost: false,
            socketId: data.playerId,
            isConnected: true,
            iconType: this.currentRoom.players.length,
          })
        } else {
          player.name = data.data.playerName || player.name
          player.isHost = false
          player.iconType = this.currentRoom.players.length
          await playerManager.updatePlayer(player)
        }

        // 加入房间
        const updatedRoom = await roomManager.addPlayerToRoom(this.currentRoom.id, player)
        if (!updatedRoom) {
          throw new Error('房间已满')
        }

        player.roomId = updatedRoom.id
        await playerManager.updatePlayer(player)

        this.currentRoom = updatedRoom

        // 发送响应
        tcpServer.sendToClient(data.playerId, {
          type: 'response',
          requestId: data.requestId,
          data: updatedRoom,
        })

        // 广播房间更新
        tcpServer.broadcast({
          type: 'broadcast',
          event: 'room:update',
          data: updatedRoom,
        })

        // 更新 UDP 广播
        udpBroadcastService.updateRoomInfo({
          currentPlayers: updatedRoom.players.length,
        })

        // 触发本地事件
        this.emit('room:update', updatedRoom)
      } catch (error: any) {
        console.error('加入房间失败:', error)
        tcpServer.sendToClient(data.playerId, {
          type: 'response',
          requestId: data.requestId,
          data: { error: error.message },
        })
      }
    })

    // 游戏动作
    tcpServer.on('game:action', async (data: any) => {
      try {
        const result = await this.handleGameAction(data.data)
        tcpServer.sendToClient(data.playerId, {
          type: 'response',
          requestId: data.requestId,
          data: result,
        })
      } catch (error: any) {
        tcpServer.sendToClient(data.playerId, {
          type: 'response',
          requestId: data.requestId,
          data: { error: error.message },
        })
      }
    })
  }

  /**
   * 设置 TCP Client 事件监听(客户端)
   */
  private setupTCPClientEvents(): void {
    // 连接成功
    tcpClient.on('connected', () => {
      console.log('✅ TCP 连接成功')
      this.emit('connected', {})
    })

    // 断开连接
    tcpClient.on('disconnected', () => {
      console.log('👋 TCP 连接断开')
      this.emit('disconnected', {})
    })

    // 房间更新
    tcpClient.on('room:update', (data: any) => {
      console.log('📨 收到房间更新:', data)
      this.currentRoom = data
      this.emit('room:update', data)
    })

    // 游戏事件
    tcpClient.on('game:started', (data: any) => {
      this.emit('game:started', data)
    })

    tcpClient.on('game:stateUpdate', (data: any) => {
      this.emit('game:stateUpdate', data)
    })

    tcpClient.on('game:ended', (data: any) => {
      this.emit('game:ended', data)
    })
  }

  /**
   * 创建模拟的 Socket.IO 对象
   */
  private createMockIO(): any {
    return {
      to: (roomId: string) => ({
        emit: (event: string, data: any) => {
          // 广播给所有客户端
          tcpServer.broadcast({
            type: 'broadcast',
            event,
            data,
          })

          // 触发本地事件(房主自己)
          this.emit(event, data)
        },
      }),
      emit: (event: string, data: any) => {
        // 全局广播
        tcpServer.broadcast({
          type: 'broadcast',
          event,
          data,
        })

        // 触发本地事件
        this.emit(event, data)
      },
    }
  }

  /**
   * 注册事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  /**
   * 触发本地事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`事件处理器错误 [${event}]:`, error)
        }
      })
    }
  }

  /**
   * 获取当前房间
   */
  getCurrentRoom(): BaseRoom | null {
    return this.currentRoom
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isHost: this.isHost,
      localIP: this.localIP,
      currentRoom: this.currentRoom,
      tcpServerStatus: this.isHost ? tcpServer.getStatus() : null,
      tcpClientStatus: !this.isHost ? tcpClient.getStatus() : null,
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    console.log('🧹 清理 LAN 服务...')

    udpBroadcastService.cleanup()
    tcpServer.stop()
    tcpClient.disconnect()

    if (this.currentRoom) {
      await gameInstanceManager.removeGameInstance(this.currentRoom.id)
      await roomManager.deleteRoom(this.currentRoom.id)
    }

    await playerManager.cleanup()

    this.currentRoom = null
    this.isHost = false

    console.log('✅ LAN 服务清理完成')
  }
}

export const lanService = LANService.getInstance()
