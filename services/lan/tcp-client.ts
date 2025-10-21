/**
 * TCP Client - 加入房间的设备使用
 * 连接到房主的 TCP 服务器
 */

import TcpSocket from 'react-native-tcp-socket'
import type { TCPMessage } from './tcp-server'

/**
 * TCP Client 类
 */
class TCPClient {
  private socket: any | null = null
  private isConnected: boolean = false
  private eventListeners: Map<string, Set<Function>> = new Map()
  private messageBuffer: string = '' // 用于处理粘包
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null
  private hostIP: string = ''
  private hostPort: number = 0
  private playerId: string = ''

  /**
   * 连接到房主的 TCP 服务器
   */
  connect(hostIP: string, port: number, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        console.log('⚠️ 已经连接到服务器')
        resolve()
        return
      }

      this.hostIP = hostIP
      this.hostPort = port
      this.playerId = playerId

      console.log(`🔌 连接到房主 TCP 服务器: ${hostIP}:${port}`)

      // 创建 TCP 客户端
      this.socket = TcpSocket.createConnection(
        {
          host: hostIP,
          port: port,
        },
        () => {
          console.log('✅ TCP 连接成功')
          this.isConnected = true
          this.reconnectAttempts = 0

          // 发送初始化消息,告知服务器我们的 playerId
          this.send({
            type: 'event',
            event: 'client:init',
            playerId: this.playerId,
            data: { playerId: this.playerId },
          })

          this.emit('connected', {})
          resolve()
        },
      )

      // 监听数据
      this.socket.on('data', (data: Buffer) => {
        this.handleServerData(data)
      })

      // 监听关闭
      this.socket.on('close', (error?: any) => {
        console.log('👋 TCP 连接关闭', error ? `错误: ${error}` : '')
        this.handleDisconnect()
      })

      // 监听错误
      this.socket.on('error', (error: any) => {
        console.error('❌ TCP 连接错误:', error)
        this.isConnected = false
        this.emit('error', { error })

        if (!this.isConnected) {
          // 连接失败
          reject(error)
        }
      })

      // 超时处理
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('连接超时'))
        }
      }, 12000)
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('🛑 断开 TCP 连接')

    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval)
      this.reconnectInterval = null
    }

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }

    this.isConnected = false
    this.messageBuffer = ''
    this.reconnectAttempts = 0

    this.emit('disconnected', {})
  }

  /**
   * 处理服务器数据(处理粘包问题)
   */
  private handleServerData(data: Buffer): void {
    try {
      // 将新数据追加到缓冲区
      this.messageBuffer += data.toString('utf8')

      // 尝试解析完整的 JSON 消息
      // 使用换行符作为消息分隔符
      const messages = this.messageBuffer.split('\n')

      // 最后一个可能是不完整的消息,保留在缓冲区
      this.messageBuffer = messages.pop() || ''

      // 处理所有完整的消息
      for (const msgStr of messages) {
        if (msgStr.trim()) {
          try {
            const message: TCPMessage = JSON.parse(msgStr)
            this.handleServerMessage(message)
          } catch (parseError) {
            console.error('解析服务器消息失败:', parseError, 'Message:', msgStr)
          }
        }
      }
    } catch (error) {
      console.error('处理服务器数据失败:', error)
    }
  }

  /**
   * 处理服务器消息
   */
  private handleServerMessage(message: TCPMessage): void {
    console.log(`📨 收到服务器消息:`, message.type, message.event)

    if (message.type === 'broadcast' && message.event) {
      // 广播消息
      this.emit(message.event, message.data)
    } else if (message.type === 'response' && message.requestId) {
      // 响应消息
      this.emit(`response:${message.requestId}`, message.data)
    } else if (message.type === 'event' && message.event) {
      // 事件消息
      this.emit(message.event, message.data)
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.isConnected = false
    this.emit('disconnected', {})

    // 尝试重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      this.reconnectInterval = setTimeout(() => {
        this.connect(this.hostIP, this.hostPort, this.playerId).catch((error) => {
          console.error('重连失败:', error)
        })
      }, 2000 * this.reconnectAttempts) // 递增延迟
    } else {
      console.error('❌ 重连失败,已达到最大重连次数')
      this.emit('reconnect_failed', {})
    }
  }

  /**
   * 发送消息到服务器
   */
  send(message: TCPMessage): boolean {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ 未连接到服务器')
      return false
    }

    try {
      // 添加 playerId 到消息
      const msgWithId = { ...message, playerId: this.playerId }
      const data = JSON.stringify(msgWithId) + '\n' // 添加换行符作为消息分隔
      this.socket.write(data)
      return true
    } catch (error) {
      console.error('发送消息失败:', error)
      return false
    }
  }

  /**
   * 发送事件(带回调)
   */
  sendEvent(event: string, data: any, callback?: (response: any) => void): void {
    const requestId = callback
      ? `${Date.now()}_${Math.random().toString(36).substring(7)}`
      : undefined

    if (callback && requestId) {
      // 注册一次性响应监听器
      const responseHandler = (response: any) => {
        this.off(`response:${requestId}`, responseHandler)
        callback(response)
      }

      this.on(`response:${requestId}`, responseHandler)

      // 超时处理
      setTimeout(() => {
        this.off(`response:${requestId}`, responseHandler)
      }, 30000) // 30秒超时
    }

    this.send({
      type: 'event',
      event,
      data,
      requestId,
    })
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
   * 获取连接状态
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hostIP: this.hostIP,
      hostPort: this.hostPort,
      playerId: this.playerId,
      reconnectAttempts: this.reconnectAttempts,
    }
  }
}

export const tcpClient = new TCPClient()
