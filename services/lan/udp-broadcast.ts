/**
 * UDP 广播服务 - 用于局域网房间发现
 * 房主设备周期性广播房间信息,其他设备监听广播来发现可用房间
 */

import dgram from 'react-native-udp'
import { Buffer } from 'buffer'

const BROADCAST_PORT = 8888 // UDP 广播端口
const BROADCAST_INTERVAL = 2000 // 广播间隔 (毫秒)

export interface RoomBroadcast {
  roomId: string
  roomName: string
  hostName: string
  hostIP: string
  tcpPort: number
  maxPlayers: number
  currentPlayers: number
  gameType: string
  timestamp: number
}

/**
 * UDP 广播服务类
 */
class UDPBroadcastService {
  private socket: dgram.Socket | null = null
  private broadcastInterval: ReturnType<typeof setInterval> | null = null
  private roomInfo: RoomBroadcast | null = null
  private discoveredRooms: Map<string, RoomBroadcast> = new Map()
  private roomTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private onRoomDiscoveredCallback: ((rooms: RoomBroadcast[]) => void) | null = null
  private broadcastFailureCount: number = 0 // 广播失败计数
  private maxBroadcastFailures: number = 5 // 最大失败次数
  private isSocketHealthy: boolean = true // socket健康状态

  /**
   * 启动 UDP 监听(用于发现房间)
   */
  startListening(onRoomDiscovered?: (rooms: RoomBroadcast[]) => void): void {
    if (this.socket) {
      console.log('⚠️ UDP listener already running')
      return
    }

    this.onRoomDiscoveredCallback = onRoomDiscovered || null

    console.log('🎧 创建 UDP Socket 用于监听广播...')
    console.log(`📍 监听配置: 端口=${BROADCAST_PORT}, 地址=0.0.0.0`)

    this.socket = dgram.createSocket({
      type: 'udp4',
      reusePort: true, // 允许地址重用 - 重要！
    })

    // 监听广播消息
    this.socket.on('message', (data: string | Buffer, rinfo: { address: string; port: number }) => {
      try {
        const message = typeof data === 'string' ? data : data.toString('utf8')
        const roomData: RoomBroadcast = JSON.parse(message)

        console.log(`📨 收到广播消息 from ${rinfo.address}:${rinfo.port}`, {
          roomId: roomData.roomId,
          roomName: roomData.roomName,
          hostIP: roomData.hostIP,
        })

        // 验证消息格式
        if (this.isValidRoomBroadcast(roomData)) {
          // 更新或添加房间
          const isNewRoom = !this.discoveredRooms.has(roomData.roomId)
          this.discoveredRooms.set(roomData.roomId, roomData)

          if (isNewRoom) {
            console.log(
              `✨ 发现新房间: ${roomData.roomName} (${roomData.hostIP}:${roomData.tcpPort})`,
            )
          } else {
            console.log(`🔄 更新房间信息: ${roomData.roomName}`)
          }

          // 清除旧的超时定时器
          const oldTimeout = this.roomTimeouts.get(roomData.roomId)
          if (oldTimeout) {
            clearTimeout(oldTimeout)
          }

          // 设置新的超时定时器(8秒没有收到广播就移除房间，给网络波动留出缓冲时间)
          const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
            this.discoveredRooms.delete(roomData.roomId)
            this.roomTimeouts.delete(roomData.roomId)
            console.log(`⏱️ 房间超时移除: ${roomData.roomName} (8秒未收到广播)`)
            this.notifyRoomsUpdate()
          }, 8000) // 增加到8秒，提高稳定性

          this.roomTimeouts.set(roomData.roomId, timeout)

          // 通知房间更新
          this.notifyRoomsUpdate()
        } else {
          console.warn('⚠️ 收到的广播消息格式不完整:', roomData)
        }
      } catch (error) {
        console.error('❌ 解析广播消息失败:', error)
        console.error('原始消息:', typeof data === 'string' ? data : data.toString('utf8'))
      }
    })

    this.socket.on('error', (error: Error) => {
      const errorCode = error?.code || 'UNKNOWN'
      const errorMessage = error?.message || error?.toString() || '未知错误'

      console.error('❌ UDP Socket 错误:', {
        code: errorCode,
        message: errorMessage,
        port: BROADCAST_PORT,
      })

      // 如果是端口占用，尝试关闭并重新绑定
      if (errorCode === 'EADDRINUSE') {
        console.warn(`⚠️ UDP 端口 ${BROADCAST_PORT} 被占用`)
        console.warn('💡 建议: 检查是否有其他应用占用了端口 8888，或者重启应用')
      } else if (errorCode === 'EACCES') {
        console.error('❌ 权限被拒绝 - 可能需要网络权限')
        console.error('💡 建议: 检查应用的网络权限设置')
      } else if (errorCode === 'ENETUNREACH') {
        console.error('❌ 网络不可达')
        console.error('💡 建议: 检查设备是否连接到 WiFi 网络')
      }

      // 尝试重新启动监听器
      setTimeout(() => {
        console.log('🔄 尝试重新启动UDP监听器...')
        this.stopListening()
        this.startListening(this.onRoomDiscoveredCallback || undefined)
      }, 3000)
    })

    // 绑定到广播端口
    try {
      console.log(`🔧 开始绑定到端口 ${BROADCAST_PORT}...`)

      this.socket.bind(
        {
          port: BROADCAST_PORT,
          address: '0.0.0.0', // 监听所有网络接口
        },
        () => {
          console.log(`✅ 成功绑定到 UDP 端口 ${BROADCAST_PORT}`)
          console.log(`🎧 开始监听 UDP 广播 (地址: 0.0.0.0:${BROADCAST_PORT})`)

          // 设置 socket 选项
          try {
            this.socket?.setBroadcast(true) // 启用广播

            // 尝试设置多播选项以提高兼容性
            try {
              this.socket?.setMulticastLoopback(true)
              this.socket?.setMulticastTTL(255)
              console.log('✅ 多播选项设置成功')
            } catch (e: unknown) {
              console.warn('⚠️ 设置多播选项失败 (可忽略):', (e as Error)?.message)
            }

            console.log('✅ UDP 广播接收已启用')
            console.log('📡 正在等待房间广播...')
          } catch (e: unknown) {
            console.error('❌ 设置广播选项失败:', (e as Error)?.message || e)
            console.error('💡 这可能导致无法接收广播消息')
          }
        },
      )
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || (error as Error)?.toString() || '未知错误'
      console.error('❌ 绑定 UDP 端口失败:', errorMessage)
      console.error('💡 建议:')
      console.error('  1. 检查端口 8888 是否被其他应用占用')
      console.error('  2. 检查应用是否有网络权限')
      console.error('  3. 尝试重启应用')
      throw error
    }
  }

  /**
   * 停止 UDP 监听
   */
  stopListening(): void {
    console.log('🛑 停止监听 UDP 广播...')

    // 清理所有超时定时器
    this.roomTimeouts.forEach((timeout) => {
      try {
        clearTimeout(timeout)
      } catch (e) {
        console.warn('清理超时定时器失败:', e)
      }
    })
    this.roomTimeouts.clear()

    // 清理已发现的房间
    this.discoveredRooms.clear()

    // 关闭 socket
    if (this.socket) {
      try {
        // 移除所有监听器，防止内存泄漏
        this.socket.removeAllListeners?.()
        this.socket.close()
        console.log('✅ UDP Socket 已关闭')
      } catch (e) {
        console.warn('⚠️ 关闭 UDP Socket 失败:', e)
      }
      this.socket = null
    }

    // 重置回调
    this.onRoomDiscoveredCallback = null

    console.log('✅ 停止监听完成')
  }

  /**
   * 开始广播房间信息(房主使用)
   */
  async startBroadcasting(roomInfo: RoomBroadcast): Promise<void> {
    if (this.broadcastInterval) {
      console.log('⚠️ 已经在广播中')
      return
    }

    this.roomInfo = roomInfo

    console.log('📡 创建 UDP Socket 用于广播房间信息...')

    // 创建广播 socket
    if (!this.socket) {
      try {
        await this.createBroadcastSocket()
      } catch (error) {
        console.error('❌ 创建广播 socket 失败:', error)
        throw error
      }
    }

    // 定期广播房间信息
    this.broadcastInterval = setInterval(() => {
      this.broadcast()
    }, BROADCAST_INTERVAL) as any

    // 立即广播第一次
    this.broadcast()

    console.log(`📡 开始广播房间: ${roomInfo.roomName} (${roomInfo.hostIP}:${roomInfo.tcpPort})`)
  }

  /**
   * 创建并初始化广播 socket（确保完全准备好）
   */
  private createBroadcastSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔧 正在创建 UDP 广播 socket...')

      const socket = dgram.createSocket({
        type: 'udp4',
        reusePort: true, // 允许地址重用
      })

      let isResolved = false

      // 错误处理
      socket.on('error', (error: Error) => {
        console.error('❌ UDP 广播 Socket 错误:', error)
        if (!isResolved) {
          isResolved = true
          reject(error)
        }
      })

      // 绑定到任意端口（让系统自动分配）
      socket.bind(() => {
        console.log('✅ UDP 广播 socket 绑定成功')

        // 启用广播
        try {
          socket.setBroadcast(true)
          console.log('✅ UDP 广播模式已启用')

          // 设置其他socket选项以提高兼容性
          try {
            // 在某些Android设备上可能需要这些设置
            if (socket.setTTL) {
              socket.setTTL(64) // 设置TTL
            }
            if (socket.setMulticastTTL) {
              socket.setMulticastTTL(64) // 设置组播TTL
            }
            console.log('✅ UDP socket选项设置完成')
          } catch (optionError) {
            console.warn('⚠️ 设置UDP socket选项失败，但不影响基本功能:', optionError)
          }

          // socket 完全准备好
          this.socket = socket
          if (!isResolved) {
            isResolved = true
            resolve()
          }
        } catch (e) {
          console.error('❌ 设置广播模式失败:', e)
          if (!isResolved) {
            isResolved = true
            reject(e)
          }
        }
      })

      // 超时保护（3秒）
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          const error = new Error('UDP 广播 socket 初始化超时')
          console.error('⏱️', error.message)
          reject(error)
        }
      }, 3000)
    })
  }

  /**
   * 停止广播
   */
  stopBroadcasting(): void {
    console.log('🛑 停止广播房间...')

    // 停止广播定时器
    if (this.broadcastInterval) {
      try {
        clearInterval(this.broadcastInterval)
        console.log('✅ 广播定时器已停止')
      } catch (e) {
        console.warn('⚠️ 清理广播定时器失败:', e)
      }
      this.broadcastInterval = null
    }

    // 清理房间信息
    this.roomInfo = null

    // 关闭 socket
    if (this.socket) {
      try {
        // 移除所有监听器，防止内存泄漏
        this.socket.removeAllListeners?.()
        this.socket.close()
        console.log('✅ UDP Socket 已关闭')
      } catch (e) {
        console.warn('⚠️ 关闭 UDP Socket 失败:', e)
      }
      this.socket = null
    }

    // 重置状态
    this.broadcastFailureCount = 0
    this.isSocketHealthy = true

    console.log('✅ 停止广播完成')
  }

  /**
   * 发送广播消息
   */
  private async broadcast(): Promise<void> {
    if (!this.socket || !this.roomInfo) {
      console.warn('⚠️ 无法广播: socket或roomInfo不存在')
      return
    }

    // 检查socket健康状态
    if (!this.isSocketHealthy) {
      console.warn('⚠️ Socket 不健康，尝试重建...')
      await this.rebuildBroadcastSocket()
      return
    }

    try {
      // 更新时间戳
      this.roomInfo.timestamp = Date.now()

      const message = JSON.stringify(this.roomInfo)
      const buffer = Buffer.from(message, 'utf8')

      // 发送到广播地址 - 尝试多个广播地址以提高兼容性
      const broadcastAddresses = [
        '255.255.255.255',
        '192.168.255.255',
        '10.255.255.255',
        '172.31.255.255',
      ]
      let successCount = 0
      let errorCount = 0

      for (const address of broadcastAddresses) {
        try {
          await new Promise<void>((resolve, reject) => {
            this.socket.send(
              buffer,
              0,
              buffer.length,
              BROADCAST_PORT,
              address,
              (error: Error | null) => {
                if (error) {
                  console.warn(`⚠️ 广播到 ${address} 失败:`, error.message)
                  errorCount++
                  reject(error)
                } else {
                  successCount++
                  resolve()
                }
              },
            )
          })
        } catch (error) {
          // 单个地址失败不影响其他地址
          continue
        }
      }

      // 评估广播结果
      if (successCount > 0) {
        // 至少有一个地址成功，重置失败计数
        if (this.broadcastFailureCount > 0) {
          console.log(`✅ 广播恢复正常 (成功: ${successCount}, 失败: ${errorCount})`)
          this.broadcastFailureCount = 0
        }
      } else {
        // 所有地址都失败
        this.broadcastFailureCount++
        console.error(
          `❌ 所有广播地址都失败 (${this.broadcastFailureCount}/${this.maxBroadcastFailures})`,
        )

        // 达到最大失败次数，标记socket不健康
        if (this.broadcastFailureCount >= this.maxBroadcastFailures) {
          console.error('❌ 广播失败次数过多，标记 socket 为不健康')
          this.isSocketHealthy = false
          this.broadcastFailureCount = 0 // 重置计数器
        }
      }
    } catch (error) {
      this.broadcastFailureCount++
      console.error(
        `❌ 广播消息异常 (${this.broadcastFailureCount}/${this.maxBroadcastFailures}):`,
        error,
      )

      if (this.broadcastFailureCount >= this.maxBroadcastFailures) {
        console.error('❌ 广播失败次数过多，标记 socket 为不健康')
        this.isSocketHealthy = false
        this.broadcastFailureCount = 0
      }
    }
  }

  /**
   * 重建广播 socket
   */
  private async rebuildBroadcastSocket(): Promise<void> {
    console.log('🔧 开始重建广播 socket...')

    // 关闭旧的 socket
    if (this.socket) {
      try {
        this.socket.close()
      } catch (e) {
        console.warn('关闭旧 socket 失败:', e)
      }
      this.socket = null
    }

    // 创建新的 socket
    try {
      await this.createBroadcastSocket()
      this.isSocketHealthy = true
      this.broadcastFailureCount = 0
      console.log('✅ 广播 socket 重建成功')
    } catch (error) {
      console.error('❌ 重建广播 socket 失败:', error)
      // 延迟后再次尝试
      setTimeout(() => {
        if (this.broadcastInterval) {
          // 如果还在广播，继续尝试重建
          this.rebuildBroadcastSocket()
        }
      }, 5000)
    }
  }

  /**
   * 更新广播的房间信息
   */
  updateRoomInfo(roomInfo: Partial<RoomBroadcast>): void {
    if (this.roomInfo) {
      this.roomInfo = { ...this.roomInfo, ...roomInfo }
    }
  }

  /**
   * 获取已发现的房间列表
   */
  getDiscoveredRooms(): RoomBroadcast[] {
    return Array.from(this.discoveredRooms.values())
  }

  /**
   * 通知房间列表更新
   */
  private notifyRoomsUpdate(): void {
    if (this.onRoomDiscoveredCallback) {
      this.onRoomDiscoveredCallback(this.getDiscoveredRooms())
    }
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    this.stopBroadcasting()
    this.stopListening()
    this.broadcastFailureCount = 0
    this.isSocketHealthy = true
  }

  /**
   * 验证房间广播数据格式
   */
  private isValidRoomBroadcast(data: unknown): data is RoomBroadcast {
    return (
      data &&
      typeof data.roomId === 'string' &&
      typeof data.roomName === 'string' &&
      typeof data.hostName === 'string' &&
      typeof data.hostIP === 'string' &&
      typeof data.tcpPort === 'number' &&
      typeof data.maxPlayers === 'number' &&
      typeof data.currentPlayers === 'number' &&
      typeof data.gameType === 'string' &&
      typeof data.timestamp === 'number'
    )
  }

  /**
   * 获取服务状态（用于调试和诊断）
   */
  getStatus() {
    return {
      isBroadcasting: this.broadcastInterval !== null,
      isListening: this.socket !== null && this.broadcastInterval === null,
      socketHealthy: this.isSocketHealthy,
      broadcastFailures: this.broadcastFailureCount,
      discoveredRoomsCount: this.discoveredRooms.size,
      roomInfo: this.roomInfo
        ? {
            roomName: this.roomInfo.roomName,
            hostIP: this.roomInfo.hostIP,
            tcpPort: this.roomInfo.tcpPort,
          }
        : null,
    }
  }

  /**
   * 网络诊断 - 检测常见问题
   */
  async diagnoseNetwork(): Promise<{
    success: boolean
    issues: string[]
    suggestions: string[]
  }> {
    const issues: string[] = []
    const suggestions: string[] = []

    console.log('🔍 开始网络诊断...')

    // 1. 检查 socket 是否存在
    if (!this.socket) {
      issues.push('UDP Socket 未创建')
      suggestions.push('请先调用 startListening() 或 startBroadcasting()')
    }

    // 2. 检查 socket 健康状态
    if (!this.isSocketHealthy) {
      issues.push('UDP Socket 不健康（频繁失败）')
      suggestions.push('可能是网络不稳定或防火墙阻止，请检查网络设置')
    }

    // 3. 检查广播失败次数
    if (this.broadcastFailureCount > 0) {
      issues.push(`广播失败 ${this.broadcastFailureCount} 次`)
      suggestions.push('检查设备是否在同一 WiFi 网络，路由器是否支持广播')
    }

    // 4. 检查是否发现房间
    if (this.discoveredRooms.size === 0 && this.broadcastInterval === null) {
      issues.push('未发现任何房间')
      suggestions.push('确保房主已开启房间，且双方在同一 WiFi 网络')
      suggestions.push('检查路由器是否开启了 AP 隔离功能')
    }

    // 5. 测试 socket 基本功能
    if (this.socket) {
      try {
        // 尝试发送测试广播
        const testMsg = JSON.stringify({ test: true, timestamp: Date.now() })
        const testBuffer = Buffer.from(testMsg, 'utf8')

        await new Promise<void>((resolve, reject) => {
          this.socket.send(
            testBuffer,
            0,
            testBuffer.length,
            BROADCAST_PORT,
            '255.255.255.255',
            (error: Error | null) => {
              if (error) {
                issues.push(`测试广播失败: ${error.message || error}`)
                suggestions.push('可能是防火墙阻止或端口被占用')
                reject(error)
              } else {
                console.log('✅ 测试广播发送成功')
                resolve()
              }
            },
          )

          // 超时
          setTimeout(() => reject(new Error('测试超时')), 2000)
        })
      } catch (error: unknown) {
        issues.push(`Socket 测试失败: ${(error as Error).message}`)
        suggestions.push('请检查网络权限和防火墙设置')
      }
    }

    const success = issues.length === 0

    console.log('🔍 诊断完成:', { success, issues, suggestions })

    return { success, issues, suggestions }
  }
}

export const udpBroadcastService = new UDPBroadcastService()
