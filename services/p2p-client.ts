/**
 * P2P Client - 基于 WebRTC 的点对点客户端
 * 连接到 P2P Server (房主设备)
 */

import { isWebRTCAvailable, RTCPeerConnection } from './webrtc-wrapper'
import type {
  CreateRoomData,
  DiceRollData,
  DiceRollResult,
  GameStartData,
  JoinRoomData,
  OnlineRoom,
  TaskCompleteData,
} from '@/types/online'

// WebRTC 配置
const RTC_CONFIGURATION = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
}

interface P2PMessage {
  type: 'event' | 'response' | 'broadcast'
  event?: string
  data?: any
  requestId?: string
  targetPlayerId?: string
}

/**
 * P2P 客户端类 - 运行在客人设备上
 */
class P2PClient {
  private static instance: P2PClient
  private isConnected: boolean = false
  private playerId: string = ''
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: any = null // 使用 any 避免类型不兼容问题
  private eventListeners: Map<string, Set<Function>> = new Map()
  private pendingRequests: Map<string, (result: any) => void> = new Map()
  private requestIdCounter: number = 0
  private pendingCandidates: RTCIceCandidate[] = []
  private currentRoom: OnlineRoom | null = null
  private connectionError: string | null = null

  private constructor() {}

  static getInstance(): P2PClient {
    if (!P2PClient.instance) {
      P2PClient.instance = new P2PClient()
    }
    return P2PClient.instance
  }

  /**
   * 连接到 P2P 服务器
   */
  async connect(playerId: string, offer: RTCSessionDescription): Promise<RTCSessionDescription> {
    if (this.isConnected) {
      console.log('Already connected to P2P server')
      throw new Error('Already connected')
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

    this.playerId = playerId
    console.log(`P2P Client connecting as ${playerId}`)

    // 创建 PeerConnection
    this.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION)

    // 设置 ICE candidate 监听
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    this.peerConnection.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        console.log('ICE candidate generated:', event.candidate)
        // 通过信令服务发送给服务器
        const webrtcSignaling = require('./webrtc-signaling').webrtcSignaling
        webrtcSignaling.sendIceCandidate('host', event.candidate)
      }
    })

    // 监听 data channel
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    this.peerConnection.addEventListener('datachannel', (event: any) => {
      console.log('Data channel received from server')
      this.dataChannel = event.channel
      this.setupDataChannel()
    })

    // 监听连接状态
    // @ts-ignore - react-native-webrtc 支持但类型定义缺失
    this.peerConnection.addEventListener('connectionstatechange', () => {
      console.log('Connection state:', this.peerConnection?.connectionState)

      if (this.peerConnection?.connectionState === 'connected') {
        this.isConnected = true
        this.connectionError = null
        this.emit('connect')
      } else if (
        this.peerConnection?.connectionState === 'failed' ||
        this.peerConnection?.connectionState === 'closed'
      ) {
        this.isConnected = false
        this.connectionError = 'Connection failed'
        this.emit('disconnect')
      }
    })

    // 设置远程描述 (offer)
    await this.peerConnection!.setRemoteDescription(offer)

    // 应用pending的candidates
    for (const candidate of this.pendingCandidates) {
      await this.peerConnection!.addIceCandidate(candidate)
    }
    this.pendingCandidates = []

    // 创建 answer
    const answer = await this.peerConnection!.createAnswer()
    await this.peerConnection!.setLocalDescription(answer)

    return answer as any
  }

  /**
   * 添加 ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (this.peerConnection && this.peerConnection.remoteDescription) {
      await this.peerConnection.addIceCandidate(candidate)
    } else {
      console.warn('Storing ICE candidate for later')
      // 限制 pending candidates 数量，避免内存泄漏
      if (this.pendingCandidates.length < 50) {
        this.pendingCandidates.push(candidate)
      } else {
        console.warn('Too many pending candidates, dropping oldest')
        this.pendingCandidates.shift() // 移除最旧的
        this.pendingCandidates.push(candidate)
      }
    }
  }

  /**
   * 设置 data channel 事件
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return

    this.dataChannel.onopen = () => {
      console.log('Data channel opened')
      this.isConnected = true
      this.emit('connect')
    }

    this.dataChannel.onclose = () => {
      console.log('Data channel closed')
      this.isConnected = false
      this.emit('disconnect')
    }

    this.dataChannel.onerror = (error: any) => {
      console.error('Data channel error:', error)
      this.connectionError = 'Data channel error'
      this.emit('error', error)
    }

    this.dataChannel.onmessage = (event: any) => {
      this.handleMessage(event.data)
    }
  }

  /**
   * 处理来自服务器的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: P2PMessage = JSON.parse(data)

      console.log('Message from server:', message.type, message.event)

      if (message.type === 'response' && message.requestId) {
        // 响应消息
        const callback = this.pendingRequests.get(message.requestId)
        if (callback) {
          callback(message.data)
          this.pendingRequests.delete(message.requestId)
        }
      } else if (message.type === 'broadcast' && message.event) {
        // 广播消息
        if (message.event === 'room:update') {
          this.currentRoom = message.data
        }
        this.emit(message.event, message.data)
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  /**
   * 发送事件到服务器
   */
  private async sendEvent(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        reject(new Error('Data channel not ready'))
        return
      }

      const requestId = `req_${++this.requestIdCounter}`
      const message: P2PMessage = {
        type: 'event',
        event,
        data,
        requestId,
      }

      this.pendingRequests.set(requestId, resolve)

      // 设置超时和重试
      let retries = 0
      const maxRetries = 3

      const attemptSend = () => {
        setTimeout(
          () => {
            if (this.pendingRequests.has(requestId)) {
              this.pendingRequests.delete(requestId)

              if (retries < maxRetries) {
                retries++
                console.log(`Request timeout, retrying (${retries}/${maxRetries})...`)
                this.pendingRequests.set(requestId, resolve)
                attemptSend()
              } else {
                reject(new Error('Request timeout after ' + maxRetries + ' retries'))
              }
            }
          },
          retries === 0 ? 10000 : 5000,
        ) // 首次10秒，重试5秒
      }

      attemptSend()

      try {
        this.dataChannel.send(JSON.stringify(message))
      } catch (error) {
        this.pendingRequests.delete(requestId)
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('Disconnecting P2P client')

    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.isConnected = false
    this.currentRoom = null
    this.pendingRequests.clear()
    this.emit('disconnect')
  }

  /**
   * 创建房间 (房主调用)
   */
  async createRoom(data: CreateRoomData): Promise<OnlineRoom> {
    const result = await this.sendEvent('room:create', data)
    if (result.error) {
      throw new Error(result.error)
    }
    return result
  }

  /**
   * 加入房间
   */
  async joinRoom(data: JoinRoomData): Promise<OnlineRoom> {
    const result = await this.sendEvent('room:join', data)
    if (result.error) {
      throw new Error(result.error)
    }
    return result
  }

  /**
   * 离开房间
   */
  async leaveRoom(): Promise<void> {
    if (this.currentRoom) {
      await this.sendEvent('room:leave', { roomId: this.currentRoom.id })
      this.currentRoom = null
    }
  }

  /**
   * 开始游戏
   */
  async startGame(data: GameStartData): Promise<void> {
    const result = await this.sendEvent('game:start', data)
    if (result?.error) {
      throw new Error(result.error)
    }
  }

  /**
   * 游戏动作 (投骰子/完成移动/完成任务)
   */
  async gameAction(
    data: DiceRollData | TaskCompleteData,
    callback?: (result: DiceRollResult) => void,
  ): Promise<any> {
    const result = await this.sendEvent('game:action', data)
    if (callback) {
      callback(result)
    }
    return result
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
   * 触发事件
   */
  private emit(event: string, data?: any): void {
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
   * 获取连接状态
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * 获取当前房间
   */
  getCurrentRoom(): OnlineRoom | null {
    return this.currentRoom
  }

  /**
   * 获取连接错误
   */
  getConnectionError(): string | null {
    return this.connectionError
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      playerId: this.playerId,
      currentRoom: this.currentRoom,
      connectionError: this.connectionError,
    }
  }
}

export const p2pClient = P2PClient.getInstance()
