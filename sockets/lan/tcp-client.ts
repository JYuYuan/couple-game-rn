/**
 * TCP Client - 加入房间的设备使用
 * 连接到房主的 TCP 服务器
 */

import TcpSocket from 'react-native-tcp-socket'
import type { TCPMessage } from './tcp-server'

/**
 * TCP Client 类
 * 🐾 已优化：添加定时器追踪系统，防止内存泄漏
 */
class TCPClient {
  private socket: TcpSocket.Socket | null = null
  private isConnected: boolean = false
  private eventListeners: Map<string, Set<Function>> = new Map()
  private messageBuffer: string = '' // 用于处理粘包
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 3 // 减少重连次数
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null
  private hostIP: string = ''
  private hostPort: number = 0
  private playerId: string = ''
  private shouldReconnect: boolean = true // 控制是否重连
  private isManualDisconnect: boolean = false // 标记手动断开
  private pendingResolve: ((value: void) => void) | null = null // 保存 Promise resolve
  private pendingReject: ((reason?: unknown) => void) | null = null // 保存 Promise reject

  // 🐾 定时器追踪系统
  private timers: Set<ReturnType<typeof setTimeout>> = new Set()

  /**
   * 🧹 清理所有定时器
   */
  private clearAllTimers(): void {
    console.log(`🧹 [TCPClient] 清理 ${this.timers.size} 个活跃定时器`)
    this.timers.forEach((timer) => {
      try {
        clearTimeout(timer)
      } catch (e) {
        console.warn('清理定时器失败:', e)
      }
    })
    this.timers.clear()
  }

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

      // 清理之前未完成的连接
      if (this.socket) {
        console.log('🧹 清理旧的socket连接')
        try {
          this.socket.destroy()
        } catch (e) {
          console.warn('清理旧socket失败:', e)
        }
        this.socket = null
      }

      this.hostIP = hostIP
      this.hostPort = port
      this.playerId = playerId
      this.shouldReconnect = true // 允许重连
      this.isManualDisconnect = false // 非手动断开
      this.pendingResolve = resolve
      this.pendingReject = reject

      console.log(`🔌 [${playerId.substring(0, 8)}] 连接到房主 TCP 服务器: ${hostIP}:${port}`)

      // 创建 TCP 客户端
      this.socket = TcpSocket.createConnection(
        {
          host: hostIP,
          port: port,
        },
        () => {
          console.log(`✅ [${this.playerId.substring(0, 8)}] TCP Socket 连接建立`)
          this.isConnected = true
          this.reconnectAttempts = 0 // 重置重连计数器
          this.isManualDisconnect = false // 重置手动断开标记

          // 发送初始化消息,告知服务器我们的 playerId
          console.log(`📤 [${this.playerId.substring(0, 8)}] 发送 client:init 消息`)
          this.send({
            type: 'event',
            event: 'client:init',
            playerId: this.playerId,
            data: { playerId: this.playerId },
          })

          this.emit('connected', {})

          // 连接成功,解决 Promise
          if (this.pendingResolve) {
            this.pendingResolve()
            this.pendingResolve = null
            this.pendingReject = null
          }
        },
      )

      // 监听数据
      this.socket.on('data', (data: any) => {
        this.handleServerData(data as Buffer)
      })

      // 监听关闭
      this.socket.on('close', (had_error: any) => {
        console.log(
          `👋 [${this.playerId.substring(0, 8)}] TCP Socket 关闭`,
          had_error ? `错误: ${JSON.stringify(had_error)}` : '',
        )
        this.handleDisconnect()
      })

      // 监听错误
      this.socket.on('error', (error: Error) => {
        console.error(`❌ [${this.playerId.substring(0, 8)}] TCP 连接错误:`, error)
        this.isConnected = false
        this.emit('error', { error })

        // 连接失败,拒绝 Promise
        if (!this.isConnected && this.pendingReject) {
          this.pendingReject(error)
          this.pendingResolve = null
          this.pendingReject = null
        }
      })

      // 🐾 超时处理 - 追踪定时器
      const connectTimeout = setTimeout(() => {
        if (!this.isConnected && this.pendingReject) {
          const timeoutError = new Error('连接超时')
          console.error(`⏱️ [${this.playerId.substring(0, 8)}] 连接超时`)
          this.pendingReject(timeoutError)
          this.pendingResolve = null
          this.pendingReject = null
        }
        this.timers.delete(connectTimeout) // 完成后清理
      }, 12000)
      this.timers.add(connectTimeout)
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log(`🛑 [${this.playerId.substring(0, 8)}] 主动断开 TCP 连接`)

    this.isManualDisconnect = true // 标记为手动断开
    this.shouldReconnect = false // 禁止重连

    // 🧹 清理所有定时器
    this.clearAllTimers()

    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval)
      this.reconnectInterval = null
    }

    if (this.socket) {
      try {
        this.socket.destroy()
      } catch (e) {
        console.warn('销毁socket失败:', e)
      }
      this.socket = null
    }

    this.isConnected = false
    this.messageBuffer = ''
    this.reconnectAttempts = 0
    this.pendingResolve = null
    this.pendingReject = null

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
    console.log(
      `📨 [${this.playerId.substring(0, 8)}] 收到服务器消息:`,
      JSON.stringify({ type: message.type, event: message.event }),
    )

    if (message.type === 'broadcast' && message.event) {
      // 广播消息
      this.emit(message.event, message.data)
    } else if (message.type === 'response' && message.requestId) {
      // 响应消息
      this.emit(`response:${message.requestId}`, message.data)
    } else if (message.type === 'event' && message.event) {
      // 事件消息（包括 server:init_ack）
      console.log(`🔔 [${this.playerId.substring(0, 8)}] 触发事件: ${message.event}`)
      this.emit(message.event, message.data)
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    const wasConnected = this.isConnected
    this.isConnected = false

    console.log(
      `⚠️ [${this.playerId.substring(0, 8)}] 连接断开 (手动=${this.isManualDisconnect}, 允许重连=${this.shouldReconnect}, 尝试次数=${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    this.emit('disconnected', {})

    // 只在非手动断开、允许重连且未超过最大次数时才重连
    // 增加条件：只有在真正失去连接的情况下才重连，避免正常连接时的重连循环
    if (
      !this.isManualDisconnect &&
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      wasConnected
    ) {
      // 检查socket状态，如果socket仍然存在且可写，说明连接可能还是正常的
      if (this.socket && !this.socket.destroyed && (this.socket as any).writable) {
        console.log(`ℹ️ [${this.playerId.substring(0, 8)}] Socket仍然可用，跳过重连`)
        this.isConnected = true // 恢复连接状态
        return
      }

      this.reconnectAttempts++
      console.log(
        `🔄 [${this.playerId.substring(0, 8)}] 准备重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      )

      // 🐾 重连定时器 - 追踪
      this.reconnectInterval = setTimeout(() => {
        console.log(
          `🔄 [${this.playerId.substring(0, 8)}] 开始第 ${this.reconnectAttempts} 次重连...`,
        )
        this.connect(this.hostIP, this.hostPort, this.playerId).catch((error) => {
          console.error(
            `❌ [${this.playerId.substring(0, 8)}] 第 ${this.reconnectAttempts} 次重连失败:`,
            error,
          )
        })
        if (this.reconnectInterval) {
          this.timers.delete(this.reconnectInterval)
        }
      }, 3000) // 固定3秒延迟
      this.timers.add(this.reconnectInterval)
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [${this.playerId.substring(0, 8)}] 重连失败,已达到最大重连次数`)
      this.shouldReconnect = false
      this.emit('reconnect_failed', {})
    } else {
      console.log(
        `ℹ️ [${this.playerId.substring(0, 8)}] 不进行重连 (手动=${this.isManualDisconnect})`,
      )
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
  sendEvent(event: string, data: unknown, callback?: (response: unknown) => void): void {
    const requestId = callback
      ? `${Date.now()}_${Math.random().toString(36).substring(7)}`
      : undefined

    if (callback && requestId) {
      // 注册一次性响应监听器
      const responseHandler = (response: unknown) => {
        this.off(`response:${requestId}`, responseHandler)
        callback(response)
      }

      this.on(`response:${requestId}`, responseHandler)

      // 🐾 超时处理 - 追踪定时器
      const responseTimeout = setTimeout(() => {
        this.off(`response:${requestId}`, responseHandler)
        this.timers.delete(responseTimeout) // 完成后清理
      }, 30000) // 30秒超时
      this.timers.add(responseTimeout)
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
  private emit(event: string, data: unknown): void {
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
