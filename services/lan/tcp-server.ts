/**
 * TCP Server - 房主设备上运行的 TCP 服务器
 * 接受其他玩家的连接并处理游戏逻辑
 */

import TcpSocket from 'react-native-tcp-socket'

const TCP_PORT = 3306 // 默认 TCP 端口

export interface TCPMessage {
  type: 'event' | 'response' | 'broadcast'
  event?: string
  data?: unknown
  requestId?: string
  playerId?: string
}

export interface ClientConnection {
  playerId: string
  socket: TcpSocket.Socket
  isConnected: boolean
  playerName?: string
}

/**
 * TCP Server 类
 */
class TCPServer {
  private server: TcpSocket.Server | null = null
  private clients: Map<string, ClientConnection> = new Map()
  private port: number = TCP_PORT
  private eventListeners: Map<string, Set<Function>> = new Map()
  private messageBuffer: Map<string, string> = new Map() // 用于处理粘包

  /**
   * 启动 TCP 服务器（支持端口自动重试）
   */
  async start(port: number = TCP_PORT): Promise<number> {
    // 如果服务器已经在运行，先停止它
    if (this.server) {
      console.log('⚠️ TCP Server 已经在运行，先停止...')
      await this.stop()
      // 等待一段时间确保端口完全释放
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return new Promise((resolve, reject) => {
      this.port = port
      let retryCount = 0
      const maxRetries = 10

      const tryStartServer = (currentPort: number) => {
        // 创建 TCP 服务器
        this.server = TcpSocket.createServer((socket: TcpSocket.Socket) => {
          this.handleNewConnection(socket)
        })

        // 监听错误
        this.server.on('error', (error: Error) => {
          const errorMessage = error?.message || error?.toString() || JSON.stringify(error)
          const errorCode = error?.code || 'UNKNOWN'
          console.error(`TCP Server 错误 (端口 ${currentPort}):`, errorMessage)
          console.error(`错误代码:`, errorCode)
          console.error(`完整错误对象:`, error)

          // 如果是端口占用错误，尝试下一个端口
          if (errorCode === 'EADDRINUSE' && retryCount < maxRetries) {
            retryCount++
            const nextPort = currentPort + 1
            console.log(`⚠️ 端口 ${currentPort} 被占用，尝试端口 ${nextPort}...`)

            // 清理当前服务器
            if (this.server) {
              try {
                this.server.close()
              } catch (e) {
                console.warn('关闭服务器时出错:', e)
              }
              this.server = null
            }

            // 短暂延迟后尝试新端口
            setTimeout(() => {
              tryStartServer(nextPort)
            }, 200)
          } else {
            // 为其他错误提供更详细的信息
            const detailedError = new Error(
              `TCP Server 启动失败: ${errorMessage} (code: ${errorCode})`,
            )
            reject(detailedError)
          }
        })

        // 开始监听 - 包裹在 try-catch 中捕获同步错误
        try {
          this.server.listen({ port: currentPort, host: '0.0.0.0' }, () => {
            this.port = currentPort
            console.log(`🚀 TCP Server 启动成功，监听端口: ${this.port}`)
            resolve(this.port)
          })
        } catch (error: unknown) {
          // 捕获 listen() 可能抛出的同步错误
          const errorMessage =
            (error as Error)?.message || (error as Error)?.toString() || JSON.stringify(error)
          const errorCode = (error as any)?.code || 'UNKNOWN'
          console.error(`TCP Server 监听失败 (端口 ${currentPort}):`, errorMessage)

          // 如果是端口占用错误，尝试下一个端口
          if (errorCode === 'EADDRINUSE' && retryCount < maxRetries) {
            retryCount++
            const nextPort = currentPort + 1
            console.log(`⚠️ 端口 ${currentPort} 被占用，尝试端口 ${nextPort}...`)

            // 清理当前服务器
            if (this.server) {
              try {
                this.server.close()
              } catch (e) {
                console.warn('关闭服务器时出错:', e)
              }
              this.server = null
            }

            // 短暂延迟后尝试新端口
            setTimeout(() => {
              tryStartServer(nextPort)
            }, 200)
          } else {
            const detailedError = new Error(
              `TCP Server 启动失败: ${errorMessage} (code: ${errorCode})`,
            )
            reject(detailedError)
          }
        }
      }

      tryStartServer(port)
    })
  }

  /**
   * 停止 TCP 服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🛑 停止 TCP Server...')

      // 关闭所有客户端连接
      this.clients.forEach((client) => {
        try {
          client.socket.destroy()
        } catch (error) {
          console.warn('关闭客户端连接失败:', error)
        }
      })
      this.clients.clear()
      this.messageBuffer.clear()

      // 关闭服务器
      if (this.server) {
        try {
          this.server.close(() => {
            console.log('✅ TCP Server 已停止')
            this.server = null
            resolve()
          })
        } catch (error) {
          console.warn('关闭服务器失败:', error)
          this.server = null
          resolve()
        }
      } else {
        console.log('✅ TCP Server 已停止（无活动服务器）')
        resolve()
      }
    })
  }

  /**
   * 处理新的客户端连接
   */
  private handleNewConnection(socket: TcpSocket.Socket): void {
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

    // 保存当前的 clientId 引用，用于在 data 事件中动态查找
    let currentClientId = tempId

    // 监听数据
    socket.on('data', (data: Buffer) => {
      // 使用当前的 clientId（可能已经更新）
      this.handleClientData(currentClientId, data)
    })

    // 监听关闭
    socket.on('close', (error?: Error) => {
      console.log(`👋 客户端断开: ${clientAddress}`, error ? `错误: ${error}` : '')
      this.handleClientDisconnect(currentClientId)
    })

    // 监听错误
    socket.on('error', (error: Error) => {
      console.error(`❌ 客户端错误 ${clientAddress}:`, error)
    })

    // 触发连接事件
    this.emit('client:connected', { clientId: tempId })

    // 存储 clientId 引用的更新函数
    ;(socket as any).__updateClientId = (newId: string) => {
      console.log(`🐛 [DEBUG] 更新 socket 的 clientId 引用: ${currentClientId} -> ${newId}`)
      currentClientId = newId
    }
  }

  /**
   * 处理客户端数据(处理粘包问题)
   */
  private handleClientData(clientId: string, data: Buffer): void {
    try {
      const client = this.clients.get(clientId)
      if (!client) return

      console.log(`🐛 [DEBUG] 收到原始数据 [${clientId}]: ${data.length} 字节`)

      // 将新数据追加到缓冲区
      let buffer = this.messageBuffer.get(clientId) || ''
      buffer += data.toString('utf8')

      console.log(`🐛 [DEBUG] 当前缓冲区大小: ${buffer.length} 字节`)

      // 尝试解析完整的 JSON 消息
      // 使用换行符作为消息分隔符
      const messages = buffer.split('\n')

      console.log(`🐛 [DEBUG] 分割后的消息数: ${messages.length}`)

      // 最后一个可能是不完整的消息,保留在缓冲区
      buffer = messages.pop() || ''
      this.messageBuffer.set(clientId, buffer)

      console.log(`🐛 [DEBUG] 保留在缓冲区: ${buffer.length} 字节`)

      // 处理所有完整的消息
      for (const msgStr of messages) {
        if (msgStr.trim()) {
          console.log(`🐛 [DEBUG] 尝试解析消息: ${msgStr.substring(0, 100)}...`)
          try {
            const message: TCPMessage = JSON.parse(msgStr)
            console.log(`🐛 [DEBUG] 消息解析成功: type=${message.type}, event=${message.event}`)
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
    console.log(
      `📨 收到消息 [${clientId}]:`,
      JSON.stringify({ type: message.type, event: message.event, playerId: message.playerId }),
    )

    console.log(`🐛 [DEBUG] 开始处理消息`)
    console.log(`🐛 [DEBUG] message.playerId: ${message.playerId}`)
    console.log(`🐛 [DEBUG] 当前 clientId: ${clientId}`)

    // 如果消息包含 playerId,更新客户端映射
    if (message.playerId) {
      const client = this.clients.get(clientId)
      console.log(`🐛 [DEBUG] client 存在: ${!!client}`)
      console.log(`🐛 [DEBUG] client.playerId: ${client?.playerId}`)

      if (client && client.playerId !== message.playerId) {
        console.log(`🔄 需要更新客户端ID: ${clientId} -> ${message.playerId}`)

        // 更新 socket 的 clientId 引用
        if (client.socket && typeof client.socket.__updateClientId === 'function') {
          client.socket.__updateClientId(message.playerId)
        }

        // 移除旧的映射
        this.clients.delete(clientId)
        const oldBuffer = this.messageBuffer.get(clientId) || ''
        this.messageBuffer.delete(clientId)

        // 添加新的映射
        client.playerId = message.playerId
        this.clients.set(message.playerId, client)
        this.messageBuffer.set(message.playerId, oldBuffer)

        console.log(`✅ 客户端ID已更新: ${clientId} -> ${message.playerId}`)
        clientId = message.playerId
      }
    }

    // 特殊处理 client:init 事件 - 确保客户端成功注册
    if (message.type === 'event' && message.event === 'client:init') {
      console.log(`✅ 客户端初始化完成: ${message.playerId || clientId}`)

      // 发送确认消息给客户端
      const targetId = message.playerId || clientId
      const success = this.sendToClient(targetId, {
        type: 'event',
        event: 'server:init_ack',
        data: { success: true, serverId: this.port, timestamp: Date.now() },
      })

      console.log(`📤 发送初始化确认到客户端 [${targetId}]: ${success ? '成功' : '失败'}`)

      // 不再继续触发事件，因为 init 是内部事件
      return
    }

    if (message.type === 'event' && message.event) {
      console.log(`🔔 触发事件: ${message.event}`)
      console.log(`🐛 [DEBUG] 事件监听器数量: ${this.eventListeners.get(message.event)?.size || 0}`)

      // 触发事件
      this.emit(message.event, {
        playerId: message.playerId || clientId,
        data: message.data,
        requestId: message.requestId,
      })

      console.log(`🐛 [DEBUG] 事件触发完成`)
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
