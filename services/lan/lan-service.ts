/**
 * LAN Service - 统一管理局域网连接
 * 集成 UDP 广播和 TCP 通信
 */

import { RoomBroadcast, udpBroadcastService } from './udp-broadcast'
import { tcpServer } from './tcp-server'
import { tcpClient } from './tcp-client'
import { getLocalIP } from '@/utils'
import roomManager from '../game-managers/room-manager'
import playerManager from '../game-managers/player-manager'
import gameInstanceManager from '../game-managers/game-instance-manager'
import type {
  BaseRoom,
  CreateRoomData,
  DiceRollData,
  GameStartData,
  JoinRoomData,
  TaskCompleteData,
} from '@/types/online'

const DEFAULT_TCP_PORT = 3306 // 默认 TCP 端口

/**
 * LAN Service 类
 * 🐾 已优化：添加定时器追踪和事件监听器清理，防止内存泄漏
 */
class LANService {
  private static instance: LANService
  private isHost: boolean = false
  private currentPlayerId: string = ''
  private currentRoom: BaseRoom | null = null
  private eventListeners: Map<string, Set<Function>> = new Map()
  private localIP: string = ''

  // 🐾 定时器追踪系统
  private timers: Set<ReturnType<typeof setTimeout>> = new Set()

  // 🐾 事件监听器引用，用于cleanup时清理
  private tcpServerHandlers: Map<string, Function> = new Map()
  private tcpClientHandlers: Map<string, Function> = new Map()

  private constructor() {}

  /**
   * 🧹 清理所有定时器
   */
  private clearAllTimers(): void {
    console.log(`🧹 [LANService] 清理 ${this.timers.size} 个活跃定时器`)
    this.timers.forEach((timer) => {
      try {
        clearTimeout(timer)
      } catch (e) {
        console.warn('清理定时器失败:', e)
      }
    })
    this.timers.clear()
  }

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
        avatarId: data.avatarId || '', // 头像ID
        gender: data.gender || 'man', // 性别
        color: this.getRandomColor(), // 随机背景色
      })
    } else {
      player.name = data.playerName
      player.isHost = true
      player.avatarId = data.avatarId || ''
      player.gender = data.gender || 'man'
      // 如果没有颜色或者重新创建房间，重新分配颜色
      if (!player.color) {
        player.color = this.getRandomColor()
      }
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
    console.log('📡 [LANService] 准备开始 UDP 广播...')
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

    console.log('📋 [LANService] 广播数据:', JSON.stringify(broadcastData))

    try {
      await udpBroadcastService.startBroadcasting(broadcastData)
      console.log('✅ [LANService] UDP 广播已启动')
    } catch (error: unknown) {
      console.error('❌ [LANService] 启动 UDP 广播失败:', error)
      console.error('💡 房间已创建，但其他设备可能无法发现此房间')
      // 不抛出错误，因为房间已经创建，只是广播失败
    }

    console.log('✅ 局域网房间创建成功')
    console.log('📱 房间ID:', room.id)
    console.log('🌐 房主IP:', this.localIP)
    console.log('🔌 TCP端口:', tcpPort)

    // 触发房间更新事件
    this.emit('room:update', room)

    // 返回包含网络信息的 LANRoom 对象
    return {
      ...room,
      connectionType: 'lan' as const,
      networkInfo: {
        hostIP: this.localIP,
        port: tcpPort,
      },
      hostIP: this.localIP,
      tcpPort: tcpPort,
    }
  }

  /**
   * 加入局域网房间(作为客户端)
   */
  async joinRoom(hostIP: string, hostPort: number, data: JoinRoomData): Promise<BaseRoom> {
    try {
      console.log(`🔗 [LANService] 开始加入局域网房间: ${hostIP}:${hostPort}`)
      console.log(
        `📋 [LANService] 玩家信息:`,
        JSON.stringify({
          playerId: this.currentPlayerId,
          playerName: data.playerName,
          avatarId: data.avatarId,
          gender: data.gender,
        }),
      )

      // 确保已初始化
      if (!this.localIP) {
        console.log('⚙️ [LANService] 初始化本地IP...')
        await this.initialize(this.currentPlayerId)
      }

      // 标记为非房主
      this.isHost = false

      // 设置 TCP Client 事件监听（在连接前设置）
      console.log('🎧 [LANService] 设置 TCP Client 事件监听器...')
      this.setupTCPClientEvents()

      // 连接到房主的 TCP 服务器
      console.log(`🔌 [LANService] 连接到房主 TCP 服务器...`)
      await tcpClient.connect(hostIP, hostPort, this.currentPlayerId)
      console.log('✅ [LANService] TCP 连接成功')

      // 发送加入房间请求
      console.log('📤 [LANService] 发送 room:join 请求...')
      return new Promise((resolve, reject) => {
        // 🐾 30秒超时 - 追踪定时器
        const joinTimeout = setTimeout(() => {
          console.error('⏱️ [LANService] 加入房间超时 (30秒)')
          reject(new Error('加入房间超时，请检查网络连接或重试'))
          this.timers.delete(joinTimeout) // 完成后清理
        }, 30000) // 增加到30秒以适应较慢的网络环境
        this.timers.add(joinTimeout)

        console.log('📤 [LANService] 调用 tcpClient.sendEvent...')
        tcpClient.sendEvent('room:join', data, (response: unknown) => {
          console.log('📨 [LANService] 收到 room:join 响应:', JSON.stringify(response))
          clearTimeout(joinTimeout)
          this.timers.delete(joinTimeout)

          const responseObj = response as { error?: string; id?: string } & BaseRoom
          if (responseObj.error) {
            console.error('❌ [LANService] 加入房间失败:', responseObj.error)
            reject(new Error(responseObj.error))
          } else {
            this.currentRoom = responseObj
            console.log('✅ [LANService] 加入房间成功，房间ID:', responseObj.id)

            // 返回包含网络信息的 LANRoom 对象
            const lanRoom = {
              ...responseObj,
              connectionType: 'lan' as const,
              networkInfo: {
                hostIP: hostIP,
                port: hostPort,
              },
              hostIP: hostIP,
              tcpPort: hostPort,
            }
            resolve(lanRoom)
          }
        })
      })
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Unknown error'
      console.error('❌ [LANService] 连接失败:', errorMessage)
      // 提供更详细的错误信息
      if (errorMessage.includes('ECONNREFUSED')) {
        throw new Error('无法连接到房主设备，请确认房主已创建房间且网络连接正常')
      } else if (errorMessage.includes('ETIMEDOUT')) {
        throw new Error('连接超时，请检查网络连接或重试')
      } else {
        throw error
      }
    }
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
      await tcpServer.stop()

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
    console.log('🎮 [LANService] 开始游戏请求, roomId:', data.roomId)

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

    console.log('📋 [LANService] 房间玩家数:', room.players.length)
    if (room.players.length < 2) {
      throw new Error('至少需要2个玩家才能开始游戏')
    }

    // 创建游戏实例
    console.log('🎮 [LANService] 创建游戏实例...')
    const mockIO = this.createMockIO()
    const game = await gameInstanceManager.createGameInstance(room, mockIO)

    if (!game) {
      throw new Error('游戏创建失败')
    }

    console.log('🚀 [LANService] 调用 game.onStart()...')
    await game.onStart() // 添加 await 等待游戏开始完成
    console.log('✅ [LANService] 游戏已开始，状态已更新')

    // 更新本地房间引用
    this.currentRoom = room
  }

  /**
   * 游戏动作
   */
  async handleGameAction(data: DiceRollData | TaskCompleteData): Promise<unknown> {
    const roomId = (data as { roomId?: string }).roomId
    console.log('🎮 [LANService] handleGameAction 调用, roomId:', roomId, 'isHost:', this.isHost)

    // 🐾 检查 roomId 是否存在
    if (!roomId) {
      console.error('❌ [LANService] roomId 不存在!')
      throw new Error('roomId 不存在')
    }

    if (this.isHost) {
      // 房主直接处理
      console.log('🎯 [LANService] 房主处理游戏动作...')
      const mockIO = this.createMockIO()

      console.log('🔍 [LANService] 获取游戏实例...')
      const game = await gameInstanceManager.getGameInstance(roomId, mockIO)

      console.log('🐛 [LANService] 游戏实例:', game)
      console.log('🐛 [LANService] 游戏实例类型:', game?.constructor?.name)
      console.log(
        '🐛 [LANService] 是否有 onPlayerAction:',
        typeof game?.onPlayerAction === 'function',
      )

      if (!game) {
        console.error('❌ [LANService] 游戏实例不存在!')
        throw new Error('游戏不存在')
      }

      if (typeof game.onPlayerAction !== 'function') {
        console.error('❌ [LANService] 游戏实例没有 onPlayerAction 方法!')
        console.error('🐛 [LANService] 游戏对象的所有属性:', Object.keys(game))
        console.error('🐛 [LANService] 游戏对象的原型:', Object.getPrototypeOf(game))
        throw new Error('游戏实例无效：缺少 onPlayerAction 方法')
      }

      let callbackResult: unknown = null
      const callback = (result: unknown) => {
        callbackResult = result
      }

      console.log('🎯 [LANService] 调用 game.onPlayerAction...')
      await game.onPlayerAction(mockIO, this.currentPlayerId, data, callback)
      console.log('✅ [LANService] onPlayerAction 执行完成, 结果:', callbackResult)

      await gameInstanceManager.updateGameInstance(roomId, game)

      return callbackResult
    } else {
      // 客户端发送到服务器
      console.log('📤 [LANService] 客户端发送游戏动作到服务器...')
      return new Promise((resolve, reject) => {
        // 🐾 10秒超时 - 追踪定时器
        const actionTimeout = setTimeout(() => {
          reject(new Error('游戏动作超时'))
          this.timers.delete(actionTimeout) // 完成后清理
        }, 10000)
        this.timers.add(actionTimeout)

        tcpClient.sendEvent('game:action', data, (response: unknown) => {
          clearTimeout(actionTimeout)
          this.timers.delete(actionTimeout)

          const responseObj = response as { error?: string }
          if (responseObj.error) {
            reject(new Error(responseObj.error))
          } else {
            resolve(response)
          }
        })
      })
    }
  }

  /**
   * 设置 TCP Server 事件监听(房主)
   * 🐾 已优化：保存事件处理器引用，便于清理
   */
  private setupTCPServerEvents(): void {
    // 客户端连接
    const clientConnectedHandler = (data: { clientId: string }) => {
      console.log('👤 新客户端连接:', data.clientId)
    }
    this.tcpServerHandlers.set('client:connected', clientConnectedHandler)
    tcpServer.on('client:connected', clientConnectedHandler)

    // 客户端断开
    const clientDisconnectedHandler = async (data: { playerId: string }) => {
      console.log('👋 客户端断开:', data.playerId)

      // 从房间移除玩家
      if (this.currentRoom) {
        const updatedRoom = await roomManager.removePlayerFromRoom(
          this.currentRoom.id,
          data.playerId,
        )
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
    }
    this.tcpServerHandlers.set('client:disconnected', clientDisconnectedHandler)
    tcpServer.on('client:disconnected', clientDisconnectedHandler)
    console.log('🐛 [DEBUG] 检查 room:join 事件监听器是否存在')

    // 加入房间
    const roomJoinHandler = async (data: {
      playerId: string
      requestId: string
      data: JoinRoomData
    }) => {
        try {
          console.log('📨 [TCPServer] 收到 room:join 请求')
          console.log(
            '📋 [TCPServer] 请求数据:',
            JSON.stringify({
              playerId: data.playerId,
              requestId: data.requestId,
              playerName: data.data?.playerName,
            }),
          )

          if (!this.currentRoom) {
            console.error('❌ [TCPServer] 房间不存在')
            throw new Error('房间不存在')
          }

          console.log('✅ [TCPServer] 当前房间:', this.currentRoom.id)

          // 创建玩家
          let player = await playerManager.getPlayer(data.playerId)
          if (!player) {
            console.log('[TCPServer] 创建新玩家:', data.playerId)
            player = await playerManager.addPlayer(data.playerId, {
              playerId: data.playerId,
              name: data.data.playerName || `Player_${data.playerId.substring(0, 6)}`,
              roomId: this.currentRoom.id,
              isHost: false,
              socketId: data.playerId,
              isConnected: true,
              avatarId: data.data.avatarId || '', // 头像ID
              gender: data.data.gender || 'man', // 性别
              color: this.getRandomColor(), // 随机背景色
            })
            console.log('✅ [TCPServer] 玩家创建成功')
          } else {
            console.log('🔄 [TCPServer] 更新现有玩家:', data.playerId)
            player.name = data.data.playerName || player.name
            player.isHost = false
            player.avatarId = data.data.avatarId || ''
            player.gender = data.data.gender || 'man'
            // 如果没有颜色，分配一个随机颜色
            if (!player.color) {
              player.color = this.getRandomColor()
            }
            await playerManager.updatePlayer(player)
            console.log('✅ [TCPServer] 玩家更新成功')
          }

          // 加入房间
          console.log('🚪 [TCPServer] 将玩家加入房间...')
          const updatedRoom = await roomManager.addPlayerToRoom(this.currentRoom.id, player)
          if (!updatedRoom) {
            console.error('❌ [TCPServer] 房间已满')
            throw new Error('房间已满')
          }

          console.log('✅ [TCPServer] 玩家已加入房间，当前玩家数:', updatedRoom.players.length)

          player.roomId = updatedRoom.id
          await playerManager.updatePlayer(player)

          this.currentRoom = updatedRoom

          // 发送响应
          console.log('📤 [TCPServer] 发送响应到客户端:', data.playerId)
          console.log(
            '📋 [TCPServer] 响应数据: requestId=',
            data.requestId,
            ', roomId=',
            updatedRoom.id,
          )

          const success = tcpServer.sendToClient(data.playerId, {
            type: 'response',
            requestId: data.requestId,
            data: updatedRoom,
          })

          console.log(success ? '✅ [TCPServer] 响应发送成功' : '❌ [TCPServer] 响应发送失败')

          // 广播房间更新
          console.log('📡 [TCPServer] 广播房间更新...')
          console.log('🐛 [DEBUG] 当前连接的客户端数:', tcpServer.getClientCount())
          tcpServer.broadcast({
            type: 'broadcast',
            event: 'room:update',
            data: updatedRoom,
          })
          console.log('🐛 [DEBUG] 广播已发送')

          // 更新 UDP 广播
          udpBroadcastService.updateRoomInfo({
            currentPlayers: updatedRoom.players.length,
          })

          // 触发本地事件
          console.log('🐛 [DEBUG] 准备触发 room:update 事件')
          console.log('🐛 [DEBUG] 监听器数量:', this.eventListeners.get('room:update')?.size || 0)
          console.log('🐛 [DEBUG] 更新后的房间玩家数:', updatedRoom.players.length)
          console.log(
            '🐛 [DEBUG] 玩家列表:',
            updatedRoom.players.map((p: any) => p.name).join(', '),
          )
          this.emit('room:update', updatedRoom)
          console.log('🐛 [DEBUG] room:update 事件已触发')
        } catch (error: unknown) {
          const errorMessage = (error as Error)?.message || 'Unknown error'
          console.error('❌ [TCPServer] 加入房间失败:', errorMessage)
          console.log('📤 [TCPServer] 发送错误响应到客户端:', data.playerId)

          tcpServer.sendToClient(data.playerId, {
            type: 'response',
            requestId: data.requestId,
            data: { error: errorMessage },
          })
        }
      }
    this.tcpServerHandlers.set('room:join', roomJoinHandler)
    tcpServer.on('room:join', roomJoinHandler)

    // 游戏动作
    const gameActionHandler = async (data: {
      playerId: string
      requestId: string
      data: DiceRollData | TaskCompleteData
    }) => {
        try {
          const result = await this.handleGameAction(data.data)
          tcpServer.sendToClient(data.playerId, {
            type: 'response',
            requestId: data.requestId,
            data: result,
          })
        } catch (error: unknown) {
          const errorMessage = (error as Error)?.message || 'Unknown error'
          tcpServer.sendToClient(data.playerId, {
            type: 'response',
            requestId: data.requestId,
            data: { error: errorMessage },
          })
        }
      }
    this.tcpServerHandlers.set('game:action', gameActionHandler)
    tcpServer.on('game:action', gameActionHandler)
  }

  /**
   * 设置 TCP Client 事件监听(客户端)
   * 🐾 已优化：保存事件处理器引用，便于清理
   */
  private setupTCPClientEvents(): void {
    // 连接成功
    const connectedHandler = () => {
      console.log('✅ TCP 连接成功')
      this.emit('connected', {})
    }
    this.tcpClientHandlers.set('connected', connectedHandler)
    tcpClient.on('connected', connectedHandler)

    // 断开连接
    const disconnectedHandler = () => {
      console.log('👋 TCP 连接断开')
      this.emit('disconnected', {})
    }
    this.tcpClientHandlers.set('disconnected', disconnectedHandler)
    tcpClient.on('disconnected', disconnectedHandler)

    // 房间更新
    const roomUpdateHandler = (data: BaseRoom) => {
      console.log('📨 收到房间更新:', data)
      this.currentRoom = data
      this.emit('room:update', data)
    }
    this.tcpClientHandlers.set('room:update', roomUpdateHandler)
    tcpClient.on('room:update', roomUpdateHandler)

    // 游戏事件
    const gameStartedHandler = (data: { gameType: string }) => {
      this.emit('game:started', data)
    }
    this.tcpClientHandlers.set('game:started', gameStartedHandler)
    tcpClient.on('game:started', gameStartedHandler)

    const gameStateUpdateHandler = (data: unknown) => {
      this.emit('game:stateUpdate', data)
    }
    this.tcpClientHandlers.set('game:stateUpdate', gameStateUpdateHandler)
    tcpClient.on('game:stateUpdate', gameStateUpdateHandler)

    const gameEndedHandler = (data: { winner?: string; reason?: string }) => {
      this.emit('game:ended', data)
    }
    this.tcpClientHandlers.set('game:ended', gameEndedHandler)
    tcpClient.on('game:ended', gameEndedHandler)
  }

  /**
   * 创建模拟的 Socket.IO 对象
   */
  private createMockIO(): {
    emit: (event: string, data: unknown) => void
    to: (roomId: string) => { emit: (event: string, data: unknown) => void }
  } {
    return {
      to: (roomId: string) => ({
        emit: (event: string, data: unknown) => {
          console.log(`📡 [MockIO] to(${roomId}).emit(${event})`)

          // 广播给所有客户端
          console.log(`📤 [MockIO] 广播到所有客户端...`)
          tcpServer.broadcast({
            type: 'broadcast',
            event,
            data,
          })

          // 触发本地事件(房主自己)
          console.log(`🔔 [MockIO] 触发本地事件: ${event}`)
          this.emit(event, data)
          console.log(`✅ [MockIO] 本地事件触发完成`)
        },
      }),
      emit: (event: string, data: unknown) => {
        console.log(`📡 [MockIO] emit(${event})`)

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
    console.log(`🐛 [LANService] 注册事件监听器: ${event}`)
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
    console.log(`🐛 [LANService] ${event} 监听器数量:`, this.eventListeners.get(event)!.size)
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
  private emit(event: string, data: unknown): void {
    console.log(`🔔 [LANService] emit 事件: ${event}`)
    console.log(`🐛 [LANService] 监听器数量: ${this.eventListeners.get(event)?.size || 0}`)

    const listeners = this.eventListeners.get(event)
    if (listeners) {
      console.log(`📢 [LANService] 开始触发 ${event} 事件，监听器数量: ${listeners.size}`)
      listeners.forEach((callback) => {
        try {
          callback(data)
          console.log(`✅ [LANService] ${event} 监听器执行成功`)
        } catch (error) {
          console.error(`事件处理器错误 [${event}]:`, error)
        }
      })
    } else {
      console.warn(`⚠️ [LANService] 没有找到 ${event} 的监听器`)
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
   * 🐾 已优化：清理所有定时器和事件监听器，防止内存泄漏
   */
  async cleanup(): Promise<void> {
    console.log('🧹 清理 LAN 服务...')

    // 🐾 清理所有定时器
    this.clearAllTimers()

    // 🐾 清理 TCP Server 事件监听器
    if (this.isHost) {
      console.log(`🧹 移除 ${this.tcpServerHandlers.size} 个 TCP Server 事件监听器`)
      this.tcpServerHandlers.forEach((handler, event) => {
        tcpServer.off(event, handler)
      })
      this.tcpServerHandlers.clear()
    }

    // 🐾 清理 TCP Client 事件监听器
    if (!this.isHost) {
      console.log(`🧹 移除 ${this.tcpClientHandlers.size} 个 TCP Client 事件监听器`)
      this.tcpClientHandlers.forEach((handler, event) => {
        tcpClient.off(event, handler)
      })
      this.tcpClientHandlers.clear()
    }

    // 清理服务
    udpBroadcastService.cleanup()
    await tcpServer.stop()
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

  /**
   * 获取随机颜色（用于玩家头像背景）
   */
  private getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
    return colors[Math.floor(Math.random() * colors.length)]
  }
}

export const lanService = LANService.getInstance()
export type { LANService }
