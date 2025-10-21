/**
 * TCP Server - 房主设备上运行的 TCP 服务器
 * 接受其他玩家的连接并处理游戏逻辑
 */

import TcpSocket from 'react-native-tcp-socket'

const TCP_PORT = 8080 // 默认 TCP 端口

export interface TCPMessage {
  type: 'event' | 'response' | 'broadcast'
  event?: string
  data?: any
  requestId?: string
  playerId?: string
}

export interface ClientConnection {
  playerId: string
  socket: any
  isConnected: boolean
  playerName?: string
}

/**
 * TCP Server 类
 */
class TCPServer {
  private server: any | null = null
  private clients: Map<string, ClientConnection> = new Map()
  private port: number = TCP_PORT
  private eventListeners: Map<string, Set<Function>> = new Map()
  private messageBuffer: Map<string, string> = new Map() // 用于处理粘包

  /**
   * 启动 TCP 服务器（支持端口自动重试）
   */
  start(port: number = TCP_PORT): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        console.log('⚠️ TCP Server 已经在运行')
        resolve(this.port)
        return
      }

      this.port = port
      let retryCount = 0
      const maxRetries = 10

      const tryStartServer = (currentPort: number) => {
        // 创建 TCP 服务器
        this.server = TcpSocket.createServer((socket: any) => {
          this.handleNewConnection(socket)
        })

        // 监听错误
        this.server.on('error', (error: any) => {
          console.error(`TCP Server 错误 (端口 ${currentPort}):`, error.message)

          // 如果是端口占用错误，尝试下一个端口
          if (error.code === 'EADDRINUSE' && retryCount < maxRetries) {
            retryCount++
            const nextPort = currentPort + 1
            console.log(`⚠️ 端口 ${currentPort} 被占用，尝试端口 ${nextPort}...`)

            // 清理当前服务器
            if (this.server) {
              this.server.close()
              this.server = null
            }

            // 短暂延迟后尝试新端口
            setTimeout(() => {
              tryStartServer(nextPort)
            }, 100)
          } else {
            reject(error)
          }
        })

        // 开始监听
        this.server.listen({ port: currentPort, host: '0.0.0.0' }, () => {
          this.port = currentPort
          console.log(`🚀 TCP Server 启动成功，监听端口: ${this.port}`)
          resolve(this.port)
        })
      }

      tryStartServer(port)
    })
  }

  /**
   * 停止 TCP 服务器
   */
  stop(): void {
    console.log('🛑 停止 TCP Server...')

    // 关闭所有客户端连接
    this.clients.forEach((client) => {
      client.socket.destroy()
    })
    this.clients.clear()
    this.messageBuffer.clear()

    // 关闭服务器
    if (this.server) {
      this.server.close()
      this.server = null
    }

    console.log('✅ TCP Server 已停止')
  }

  /**
   * 处理新的客户端连接
   */
  private handleNewConnection(socket: any): void {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`📱 新客户端连接: ${clientAddress}`)

    // 生成临时客户端ID(稍后会被实际的 playerId 替换)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const client: ClientConnection = {
      playerId: tempId,
      socket,
      isConnected: true,
    }

    this.clients.set(tempId, client)
    this.messageBuffer.set(tempId, '')

    // 监听数据
    socket.on('data', (data: Buffer) => {
      this.handleClientData(tempId, data)
    })

    // 监听关闭
    socket.on('close', (error?: any) => {
      console.log(`👋 客户端断开: ${clientAddress}`, error ? `错误: ${error}` : '')
      this.handleClientDisconnect(tempId)
    })

    // 监听错误
    socket.on('error', (error: any) => {
      console.error(`❌ 客户端错误 ${clientAddress}:`, error)
    })

    // 触发连接事件
    this.emit('client:connected', { clientId: tempId })
  }

  /**
   * 处理客户端数据(处理粘包问题)
   */
  private handleClientData(clientId: string, data: Buffer): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) return

      // 将新数据追加到缓冲区
      let buffer = this.messageBuffer.get(clientId) || ''
      buffer += data.toString('utf8')

      // 尝试解析完整的 JSON 消息
      // 使用换行符作为消息分隔符
      const messages = buffer.split('\n')

      // 最后一个可能是不完整的消息,保留在缓冲区
      buffer = messages.pop() || ''
      this.messageBuffer.set(clientId, buffer)

      // 处理所有完整的消息
      for (const msgStr of messages) {
        if (msgStr.trim()) {
          try {
            const message: TCPMessage = JSON.parse(msgStr)
            this.handleClientMessage(clientId, message)
          } catch (parseError) {
            console.error('解析消息失败:', parseError, 'Message:', msgStr)
          }
        }
      }
    } catch (error) {
      console.error('处理客户端数据失败:', error)
    }
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(clientId: string, message: TCPMessage): void {
    console.log(`📨 收到消息 [${clientId}]:`, message.type, message.event)

    // 如果消息包含 playerId,更新客户端映射
    if (message.playerId) {
      const client = this.clients.get(clientId)
      if (client && client.playerId !== message.playerId) {
        // 移除旧的映射
        this.clients.delete(clientId)
        this.messageBuffer.delete(clientId)

        // 添加新的映射
        client.playerId = message.playerId
        this.clients.set(message.playerId, client)
        this.messageBuffer.set(message.playerId, this.messageBuffer.get(clientId) || '')

        console.log(`🔄 更新客户端ID: ${clientId} -> ${message.playerId}`)
        clientId = message.playerId
      }
    }

    if (message.type === 'event' && message.event) {
      // 触发事件
      this.emit(message.event, {
        playerId: message.playerId || clientId,
        data: message.data,
        requestId: message.requestId,
      })
    }
  }

  /**
   * 处理客户端断开
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.isConnected = false
      this.clients.delete(clientId)
      this.messageBuffer.delete(clientId)

      // 触发断开事件
      this.emit('client:disconnected', { playerId: client.playerId })
    }
  }

  /**
   * 发送消息给特定客户端
   */
  sendToClient(playerId: string, message: TCPMessage): boolean {
    const client = this.clients.get(playerId)
    if (!client || !client.isConnected) {
      console.warn(`⚠️ 客户端未连接: ${playerId}`)
      return false
    }

    try {
      const data = JSON.stringify(message) + '\n' // 添加换行符作为消息分隔
      client.socket.write(data)
      return true
    } catch (error) {
      console.error(`发送消息失败 [${playerId}]:`, error)
      return false
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: TCPMessage, excludePlayerId?: string): void {
    this.clients.forEach((client, playerId) => {
      if (playerId !== excludePlayerId) {
        this.sendToClient(playerId, message)
      }
    })
  }

  /**
   * 获取已连接的客户端列表
   */
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys()).filter((id) => this.clients.get(id)?.isConnected)
  }

  /**
   * 获取客户端数量
   */
  getClientCount(): number {
    return this.getConnectedClients().length
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
   * 获取服务器状态
   */
  getStatus() {
    return {
      isRunning: this.server !== null,
      port: this.port,
      clientCount: this.getClientCount(),
      connectedClients: this.getConnectedClients(),
    }
  }
}

export const tcpServer = new TCPServer()
