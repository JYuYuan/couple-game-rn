/**
 * P2P Server - 基于 WebRTC 的点对点服务器
 * 允许一台设备作为服务器,其他设备通过 WebRTC 连接
 * 复刻服务端逻辑,但运行在客户端(房主设备)上
 */

import {
  isWebRTCAvailable,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from './webrtc-wrapper'
import type {
  BaseRoom,
  CreateRoomData,
  DiceRollData,
  GameStartData,
  JoinRoomData,
  TaskCompleteData,
} from '@/types/online'
import roomManager from './p2p/room-manager'
import playerManager from './p2p/player-manager'
import gameInstanceManager from './p2p/game-instance-manager'

// WebRTC 配置
const RTC_CONFIGURATION = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
}

// P2P 消息类型
interface P2PMessage {
  type: 'event' | 'response' | 'broadcast'
  event?: string
  data?: any
  requestId?: string
  targetPlayerId?: string // 用于点对点消息
}

// 连接信息
interface PeerConnection {
  playerId: string
  connection: RTCPeerConnection
  dataChannel: any // 使用 any 避免类型不兼容问题
  isConnected: boolean
}

/**
 * P2P 服务器类 - 运行在房主设备上
 */
class P2PServer {
  private static instance: P2PServer
  private isRunning: boolean = false
  private hostPlayerId: string = ''
  private peers: Map<string, PeerConnection> = new Map()
  private eventListeners: Map<string, Set<Function>> = new Map()
  private pendingCandidates: Map<string, RTCIceCandidate[]> = new Map()

  private constructor() {}

  static getInstance(): P2PServer {
    if (!P2PServer.instance) {
      P2PServer.instance = new P2PServer()
    }
    return P2PServer.instance
  }

  /**
   * 启动 P2P 服务器
   */
  async start(hostPlayerId: string): Promise<void> {
    if (this.isRunning) {
      console.log('P2P Server already running')
      return
    }

    // 检查 WebRTC 是否可用
    if (!isWebRTCAvailable()) {
      console.warn(
        '⚠️ WebRTC is not available. P2P mode requires expo-dev-client or a production build.',
      )
      throw new Error(
        'WebRTC 不可用。P2P 模式需要使用 expo-dev-client 或生产构建，无法在 Expo Go 中运行。',
      )
    }

    this.hostPlayerId = hostPlayerId
    this.isRunning = true

    console.log(`🚀 P2P Server started by host: ${hostPlayerId}`)

    // 初始化房主玩家
    await playerManager.addPlayer(hostPlayerId, {
      playerId: hostPlayerId,
      name: 'Host',
      roomId: null,
      isHost: true,
      socketId: 'host',
      isConnected: true,
    })

    this.setupEventHandlers()
  }

  /**
   * 停止 P2P 服务器
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping P2P Server...')

    // 关闭所有连接
    for (const [playerId, peer] of this.peers.entries()) {
      this.closePeerConnection(playerId)
    }

    this.peers.clear()
    this.pendingCandidates.clear()
    this.isRunning = false

    // 清理数据
    await roomManager.cleanup()
    await playerManager.cleanup()
    await gameInstanceManager.cleanup()

    console.log('✅ P2P Server stopped')
  }

  /**
   * 创建与新玩家的 WebRTC 连接
   */
  async createPeerConnection(
    playerId: string,
    offer?: RTCSessionDescription,
  ): Promise<RTCSessionDescription> {
    console.log(`Creating peer connection for player: ${playerId}`)

    const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION)
    let dataChannel: any = null

    // 如果是发起方(接收 offer),创建 data channel
    if (!offer) {
      dataChannel = peerConnection.createDataChannel('gameData', {
        ordered: true,
      })
      this.setupDataChannel(playerId, dataChannel)
    }

    // 设置 ICE candidate 监听
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    peerConnection.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        console.log(`ICE candidate for ${playerId}:`, event.candidate)
        // 通过信令通道发送 ICE candidate
        this.emit('ice-candidate', {
          targetPlayerId: playerId,
          candidate: event.candidate,
        })
      }
    })

    // 监听 data channel (当作为接收方时)
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    peerConnection.addEventListener('datachannel', (event: any) => {
      console.log(`Data channel received from ${playerId}`)
      dataChannel = event.channel
      this.setupDataChannel(playerId, dataChannel)
    })

    // 监听连接状态
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    peerConnection.addEventListener('connectionstatechange', () => {
      console.log(`Connection state for ${playerId}:`, peerConnection.connectionState)

      const peer = this.peers.get(playerId)
      if (peer) {
        peer.isConnected = peerConnection.connectionState === 'connected'
      }

      if (
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed'
      ) {
        this.closePeerConnection(playerId)
      }
    })

    // 保存连接信息
    this.peers.set(playerId, {
      playerId,
      connection: peerConnection,
      dataChannel,
      isConnected: false,
    })

    // 处理 offer/answer
    if (offer) {
      // 接收到 offer,创建 answer
      await peerConnection.setRemoteDescription(offer)

      // 应用pending的candidates
      const pendingCandidates = this.pendingCandidates.get(playerId) || []
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate)
      }
      this.pendingCandidates.delete(playerId)

      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      return answer
    } else {
      // 创建 offer
      const offerDescription = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offerDescription)
      return offerDescription
    }
  }

  /**
   * 处理远程 answer
   */
  async handleAnswer(playerId: string, answer: RTCSessionDescription): Promise<void> {
    const peer = this.peers.get(playerId)
    if (!peer) {
      console.error(`No peer connection found for ${playerId}`)
      return
    }

    await peer.connection.setRemoteDescription(answer)

    // 应用pending的candidates
    const pendingCandidates = this.pendingCandidates.get(playerId) || []
    for (const candidate of pendingCandidates) {
      await peer.connection.addIceCandidate(candidate)
    }
    this.pendingCandidates.delete(playerId)
  }

  /**
   * 添加 ICE candidate
   */
  async addIceCandidate(playerId: string, candidate: RTCIceCandidate): Promise<void> {
    const peer = this.peers.get(playerId)
    if (!peer) {
      console.warn(`No peer for ${playerId}, storing candidate`)
      if (!this.pendingCandidates.has(playerId)) {
        this.pendingCandidates.set(playerId, [])
      }
      this.pendingCandidates.get(playerId)!.push(candidate)
      return
    }

    if (peer.connection.remoteDescription) {
      await peer.connection.addIceCandidate(candidate)
    } else {
      console.warn(`Remote description not set for ${playerId}, storing candidate`)
      if (!this.pendingCandidates.has(playerId)) {
        this.pendingCandidates.set(playerId, [])
      }
      this.pendingCandidates.get(playerId)!.push(candidate)
    }
  }

  /**
   * 设置 data channel 事件
   */
  private setupDataChannel(playerId: string, dataChannel: any): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for ${playerId}`)
      const peer = this.peers.get(playerId)
      if (peer) {
        peer.dataChannel = dataChannel
        peer.isConnected = true
      }
    }

    dataChannel.onclose = () => {
      console.log(`Data channel closed for ${playerId}`)
      const peer = this.peers.get(playerId)
      if (peer) {
        peer.isConnected = false
      }
    }

    dataChannel.onerror = (error: any) => {
      console.error(`Data channel error for ${playerId}:`, error)
    }

    dataChannel.onmessage = (event: any) => {
      this.handleMessage(playerId, event.data)
    }
  }

  /**
   * 处理来自客户端的消息
   */
  private async handleMessage(playerId: string, data: string): Promise<void> {
    try {
      const message: P2PMessage = JSON.parse(data)

      console.log(`Message from ${playerId}:`, message.type, message.event)

      if (message.type === 'event') {
        await this.handleEvent(playerId, message.event!, message.data, message.requestId)
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  /**
   * 设置游戏事件处理器(复刻 socketHandlers.ts 逻辑)
   */
  private setupEventHandlers(): void {
    // 这里的事件处理逻辑将在下一步实现
    // 复刻 server/server/socketHandlers.ts 的逻辑
  }

  /**
   * 处理客户端事件
   */
  private async handleEvent(
    playerId: string,
    event: string,
    data: any,
    requestId?: string,
  ): Promise<void> {
    try {
      let result: any = null

      switch (event) {
        case 'room:create':
          result = await this.handleCreateRoomPrivate(playerId, data)
          break
        case 'room:join':
          result = await this.handleJoinRoom(playerId, data)
          break
        case 'room:leave':
          result = await this.handleLeaveRoom(playerId, data)
          break
        case 'game:start':
          result = await this.handleStartGamePrivate(playerId, data)
          break
        case 'game:action':
          result = await this.handleGameActionPrivate(playerId, data)
          break
        default:
          console.warn(`Unknown event: ${event}`)
      }

      // 发送响应
      if (requestId) {
        this.sendToPlayer(playerId, {
          type: 'response',
          requestId,
          data: result,
        })
      }
    } catch (error) {
      console.error(`Error handling event ${event}:`, error)
      if (requestId) {
        this.sendToPlayer(playerId, {
          type: 'response',
          requestId,
          data: { error: (error as Error).message },
        })
      }
    }
  }

  /**
   * 创建房间(公开方法)
   */
  async handleCreateRoom(playerId: string, roomInfo: CreateRoomData): Promise<BaseRoom> {
    return await this.handleCreateRoomPrivate(playerId, roomInfo)
  }

  /**
   * 开始游戏(公开方法)
   */
  async handleStartGame(playerId: string, data: GameStartData): Promise<void> {
    return await this.handleStartGamePrivate(playerId, data)
  }

  /**
   * 游戏动作(公开方法)
   */
  async handleGameAction(playerId: string, data: DiceRollData | TaskCompleteData): Promise<any> {
    return await this.handleGameActionPrivate(playerId, data)
  }

  /**
   * 创建房间
   */
  private async handleCreateRoomPrivate(
    playerId: string,
    roomInfo: CreateRoomData,
  ): Promise<BaseRoom> {
    // 获取或创建玩家
    let player = await playerManager.getPlayer(playerId)
    if (!player) {
      player = await playerManager.addPlayer(playerId, {
        playerId,
        name: roomInfo.playerName,
        roomId: null,
        isHost: true,
        socketId: playerId,
        isConnected: true,
      })
    } else {
      player.name = roomInfo.playerName
      player.isHost = true
      await playerManager.updatePlayer(player)
    }

    let room = await roomManager.createRoom({
      name: roomInfo.roomName || `Room_${Date.now()}`,
      hostId: playerId,
      maxPlayers: roomInfo.maxPlayers || 2,
      gameType: roomInfo.gameType || 'fly',
      taskSet: roomInfo.taskSet || null,
    })

    // 将创建者加入房间
    const roomResult = await roomManager.addPlayerToRoom(room.id, player)
    if (!roomResult) {
      throw new Error('Failed to add player to room')
    }
    room = roomResult
    player.roomId = room.id

    await playerManager.updatePlayer(player)

    // 广播房间更新
    this.broadcastToRoom(room.id, 'room:update', room)

    return room
  }

  /**
   * 加入房间
   */
  private async handleJoinRoom(playerId: string, joinData: JoinRoomData): Promise<BaseRoom> {
    const roomId = joinData.roomId
    let room = await roomManager.getRoom(roomId)
    if (!room) {
      throw new Error('房间不存在或已满')
    }

    // 获取或创建玩家
    let player = await playerManager.getPlayer(playerId)
    if (!player) {
      player = await playerManager.addPlayer(playerId, {
        playerId,
        name: joinData.playerName || `Player_${playerId.substring(0, 6)}`,
        roomId: joinData.roomId,
        isHost: false,
        socketId: playerId,
        isConnected: true,
        iconType: room?.players.length,
      })
    } else {
      player.name = joinData.playerName || player.name
      player.isHost = false
      player.iconType = room?.players.length
      await playerManager.updatePlayer(player)
    }

    room = await roomManager.addPlayerToRoom(roomId, player)
    if (!room) {
      throw new Error('房间不存在或已满')
    }

    player.roomId = room.id
    await playerManager.updatePlayer(player)

    // 广播房间更新
    this.broadcastToRoom(roomId, 'room:update', room)

    return room
  }

  /**
   * 离开房间
   */
  private async handleLeaveRoom(playerId: string, data: any): Promise<void> {
    const player = await playerManager.getPlayer(playerId)
    if (!player || !player.roomId) {
      throw new Error('玩家不在任何房间中')
    }

    const room = await roomManager.getRoom(player.roomId)
    if (!room) {
      throw new Error('房间不存在')
    }

    const isHost = room.hostId === playerId
    const roomId = room.id

    // 如果是房主离开
    if (isHost) {
      // 通知所有玩家房间被销毁
      this.broadcastToRoom(roomId, 'room:destroyed', {
        reason: 'host_left',
        message: '房主已离开，房间已关闭',
      })

      // 清理所有玩家的房间信息
      for (const p of room.players) {
        const playerData = await playerManager.getPlayer(p.id)
        if (playerData) {
          playerData.roomId = null
          await playerManager.updatePlayer(playerData)
        }
      }

      // 清理游戏实例
      await gameInstanceManager.removeGameInstance(roomId)

      // 删除房间
      await roomManager.deleteRoom(roomId)
    } else {
      // 普通玩家离开
      const updatedRoom = await roomManager.removePlayerFromRoom(roomId, playerId)

      // 清理玩家的房间信息
      player.roomId = null
      await playerManager.updatePlayer(player)

      if (updatedRoom) {
        this.broadcastToRoom(roomId, 'room:update', updatedRoom)

        // 如果只剩一个玩家，游戏退回到等待状态
        if (updatedRoom.players.length === 1 && updatedRoom.gameStatus === 'playing') {
          updatedRoom.gameStatus = 'waiting'
          await roomManager.updateRoom(updatedRoom)
          await gameInstanceManager.removeGameInstance(roomId)
          this.broadcastToRoom(roomId, 'room:update', updatedRoom)
        }
      } else {
        await gameInstanceManager.removeGameInstance(roomId)
      }
    }
  }

  /**
   * 开始游戏
   */
  private async handleStartGamePrivate(playerId: string, data: GameStartData): Promise<void> {
    const room = await roomManager.getRoom(data.roomId)
    if (!room) {
      throw new Error('房间不存在')
    }

    const player = await playerManager.getPlayer(playerId)
    if (!player || !player.isHost) {
      throw new Error('只有房主可以开始游戏')
    }

    if (room.players.length < 2) {
      throw new Error('至少需要2个玩家才能开始游戏')
    }

    // 创建游戏实例 - 这里需要一个模拟的 io 对象
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
  private async handleGameActionPrivate(
    playerId: string,
    data: DiceRollData | TaskCompleteData,
  ): Promise<any> {
    const roomId = (data as any).roomId
    const mockIO = this.createMockIO()
    const game = await gameInstanceManager.getGameInstance(roomId, mockIO)

    if (!game) {
      throw new Error('游戏不存在')
    }

    // 创建回调函数
    let callbackResult: any = null
    const callback = (result: any) => {
      callbackResult = result
    }

    await game.onPlayerAction(mockIO, playerId, data, callback)
    await gameInstanceManager.updateGameInstance(roomId, game)

    return callbackResult
  }

  /**
   * 创建模拟的 Socket.IO 对象
   */
  private createMockIO(): any {
    return {
      to: (roomId: string) => ({
        emit: (event: string, data: any) => {
          this.broadcastToRoom(roomId, event, data)
        },
      }),
      emit: (event: string, data: any) => {
        this.broadcast(event, data)
      },
    }
  }

  /**
   * 发送消息给特定玩家
   */
  private sendToPlayer(playerId: string, message: P2PMessage): void {
    const peer = this.peers.get(playerId)
    if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
      console.warn(`Cannot send to ${playerId}: channel not ready`)
      return
    }

    try {
      peer.dataChannel.send(JSON.stringify(message))
    } catch (error) {
      console.error(`Error sending to ${playerId}:`, error)
    }
  }

  /**
   * 广播消息给房间内所有玩家
   */
  private async broadcastToRoom(roomId: string, event: string, data: any): Promise<void> {
    const room = await roomManager.getRoom(roomId)
    if (!room) return

    const message: P2PMessage = {
      type: 'broadcast',
      event,
      data,
    }

    for (const player of room.players) {
      if (player.id !== this.hostPlayerId) {
        this.sendToPlayer(player.id, message)
      }
    }

    // 如果房主在房间内,也触发本地事件
    if (room.players.some((p) => p.id === this.hostPlayerId)) {
      this.emit(event, data)
    }
  }

  /**
   * 广播消息给所有连接的玩家
   */
  private broadcast(event: string, data: any): void {
    const message: P2PMessage = {
      type: 'broadcast',
      event,
      data,
    }

    for (const [playerId, peer] of this.peers.entries()) {
      this.sendToPlayer(playerId, message)
    }

    // 触发本地事件
    this.emit(event, data)
  }

  /**
   * 关闭与玩家的连接
   */
  private closePeerConnection(playerId: string): void {
    const peer = this.peers.get(playerId)
    if (!peer) return

    peer.dataChannel?.close()
    peer.connection.close()
    this.peers.delete(playerId)

    console.log(`Closed connection with ${playerId}`)
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
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hostPlayerId: this.hostPlayerId,
      connectedPeers: Array.from(this.peers.keys()),
      peerCount: this.peers.size,
    }
  }
}

export const p2pServer = P2PServer.getInstance()
