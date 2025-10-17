/**
 * WebRTC Signaling Service
 * 用于在建立 P2P 连接前交换 SDP 和 ICE candidates
 * 这个服务需要一个简单的信令服务器或使用其他通信方式(如Socket.IO, Firebase等)
 */

/**
 * 信令消息类型
 */
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  from: string
  to: string
  data: any
}

/**
 * WebRTC 信令服务
 * 使用现有的 Socket.IO 连接作为信令通道
 */
class WebRTCSignalingService {
  private static instance: WebRTCSignalingService
  private playerId: string = ''
  private messageHandlers: Map<string, Function> = new Map()
  private _socketService: any = null

  private constructor() {
    // 延迟设置监听器，在初始化时通过 getter 获取 socketService
  }

  private get socketService() {
    if (!this._socketService) {
      // 延迟导入避免循环依赖
      this._socketService = require('./socket-service').socketService
    }
    return this._socketService
  }

  static getInstance(): WebRTCSignalingService {
    if (!WebRTCSignalingService.instance) {
      WebRTCSignalingService.instance = new WebRTCSignalingService()
    }
    return WebRTCSignalingService.instance
  }

  /**
   * 初始化信令服务
   */
  initialize(playerId: string): void {
    this.playerId = playerId
    console.log(`WebRTC Signaling initialized for ${playerId}`)
    // 在初始化时设置监听器
    this.setupSignalingListeners()
  }

  /**
   * 设置信令监听器
   */
  private setupSignalingListeners(): void {
    // 监听来自服务器的信令消息
    this.socketService.on('webrtc:offer', (data: SignalingMessage) => {
      this.handleSignalingMessage('offer', data)
    })

    this.socketService.on('webrtc:answer', (data: SignalingMessage) => {
      this.handleSignalingMessage('answer', data)
    })

    this.socketService.on('webrtc:ice-candidate', (data: SignalingMessage) => {
      this.handleSignalingMessage('ice-candidate', data)
    })
  }

  /**
   * 处理信令消息
   */
  private handleSignalingMessage(type: string, data: SignalingMessage): void {
    console.log(`Received ${type} from ${data.from}`)

    const handler = this.messageHandlers.get(type)
    if (handler) {
      handler(data)
    }
  }

  /**
   * 发送 offer
   */
  sendOffer(targetPlayerId: string, offer: any): void {
    const message: SignalingMessage = {
      type: 'offer',
      from: this.playerId,
      to: targetPlayerId,
      data: offer,
    }

    this.socketService.socketEmit('webrtc:offer', message)
    console.log(`Sent offer to ${targetPlayerId}`)
  }

  /**
   * 发送 answer
   */
  sendAnswer(targetPlayerId: string, answer: any): void {
    const message: SignalingMessage = {
      type: 'answer',
      from: this.playerId,
      to: targetPlayerId,
      data: answer,
    }

    this.socketService.socketEmit('webrtc:answer', message)
    console.log(`Sent answer to ${targetPlayerId}`)
  }

  /**
   * 发送 ICE candidate
   */
  sendIceCandidate(targetPlayerId: string, candidate: any): void {
    const message: SignalingMessage = {
      type: 'ice-candidate',
      from: this.playerId,
      to: targetPlayerId,
      data: candidate,
    }

    this.socketService.socketEmit('webrtc:ice-candidate', message)
    console.log(`Sent ICE candidate to ${targetPlayerId}`)
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: Function): void {
    this.messageHandlers.set(type, handler)
  }

  /**
   * 移除消息处理器
   */
  off(type: string): void {
    this.messageHandlers.delete(type)
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.messageHandlers.clear()
    console.log('WebRTC Signaling cleaned up')
  }
}

export const webrtcSignaling = WebRTCSignalingService.getInstance()
