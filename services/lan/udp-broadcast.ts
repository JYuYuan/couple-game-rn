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
  private socket: any | null = null
  private broadcastInterval: ReturnType<typeof setInterval> | null = null
  private roomInfo: RoomBroadcast | null = null
  private discoveredRooms: Map<string, RoomBroadcast> = new Map()
  private roomTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private onRoomDiscoveredCallback: ((rooms: RoomBroadcast[]) => void) | null = null

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

    this.socket = dgram.createSocket({
      type: 'udp4',
      reuseAddr: true, // 允许地址重用 - 重要！
    })

    // 监听广播消息
    this.socket.on('message', (data: string | Buffer, rinfo: any) => {
      try {
        const message = typeof data === 'string' ? data : data.toString('utf8')
        const roomData: RoomBroadcast = JSON.parse(message)

        // 验证消息格式
        if (roomData.roomId && roomData.hostIP && roomData.tcpPort) {
          // 更新或添加房间
          this.discoveredRooms.set(roomData.roomId, roomData)
          console.log(`📡 发现房间: ${roomData.roomName} (${roomData.hostIP}:${roomData.tcpPort})`)

          // 清除旧的超时定时器
          const oldTimeout = this.roomTimeouts.get(roomData.roomId)
          if (oldTimeout) {
            clearTimeout(oldTimeout)
          }

          // 设置新的超时定时器(5秒没有收到广播就移除房间)
          const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
            this.discoveredRooms.delete(roomData.roomId)
            this.roomTimeouts.delete(roomData.roomId)
            console.log(`🗑️ 房间超时移除: ${roomData.roomName}`)
            this.notifyRoomsUpdate()
          }, 5000)

          this.roomTimeouts.set(roomData.roomId, timeout)

          // 通知房间更新
          this.notifyRoomsUpdate()
        }
      } catch (error) {
        console.error('解析 UDP 广播消息失败:', error)
      }
    })

    this.socket.on('error', (error: any) => {
      console.error('UDP Socket 错误:', error)

      // 如果是端口占用，尝试关闭并重新绑定
      if (error.code === 'EADDRINUSE') {
        console.warn(`⚠️ UDP 端口 ${BROADCAST_PORT} 被占用，尝试重用...`)
      }
    })

    // 绑定到广播端口
    try {
      this.socket.bind(
        {
          port: BROADCAST_PORT,
          address: '0.0.0.0', // 监听所有网络接口
        },
        () => {
          console.log(`✅ 开始监听 UDP 广播 (端口: ${BROADCAST_PORT}, 地址: 0.0.0.0)`)

          // 设置 socket 选项
          try {
            this.socket?.setBroadcast(true) // 启用广播
            console.log('✅ UDP 广播已启用')
          } catch (e) {
            console.warn('⚠️ 设置广播选项失败:', e)
          }
        },
      )
    } catch (error: any) {
      console.error('❌ 绑定 UDP 端口失败:', error)
      throw error
    }
  }

  /**
   * 停止 UDP 监听
   */
  stopListening(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
      console.log('🛑 停止监听 UDP 广播')
    }

    // 清理所有超时定时器
    this.roomTimeouts.forEach((timeout) => clearTimeout(timeout))
    this.roomTimeouts.clear()
    this.discoveredRooms.clear()
  }

  /**
   * 开始广播房间信息(房主使用)
   */
  startBroadcasting(roomInfo: RoomBroadcast): void {
    if (this.broadcastInterval) {
      console.log('⚠️ 已经在广播中')
      return
    }

    this.roomInfo = roomInfo

    console.log('📡 创建 UDP Socket 用于广播房间信息...')

    // 创建广播 socket
    if (!this.socket) {
      this.socket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true, // 允许地址重用
      })

      this.socket.on('error', (error: any) => {
        console.error('❌ UDP 广播 Socket 错误:', error)
      })

      // 绑定到任意端口（让系统自动分配）
      this.socket.bind(() => {
        console.log('✅ UDP 广播 socket 绑定成功')
        // 启用广播
        try {
          this.socket?.setBroadcast(true)
          console.log('✅ UDP 广播模式已启用')
        } catch (e) {
          console.warn('⚠️ 设置广播模式失败:', e)
        }
      })
    }

    // 定期广播房间信息
    this.broadcastInterval = setInterval(() => {
      this.broadcast()
    }, BROADCAST_INTERVAL) as any

    // 立即广播一次
    setTimeout(() => this.broadcast(), 500)

    console.log(`📡 开始广播房间: ${roomInfo.roomName} (${roomInfo.hostIP}:${roomInfo.tcpPort})`)
  }

  /**
   * 停止广播
   */
  stopBroadcasting(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
      this.roomInfo = null
      console.log('🛑 停止广播房间')
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * 发送广播消息
   */
  private broadcast(): void {
    if (!this.socket || !this.roomInfo) {
      console.warn('⚠️ 无法广播: socket或roomInfo不存在')
      return
    }

    try {
      // 更新时间戳
      this.roomInfo.timestamp = Date.now()

      const message = JSON.stringify(this.roomInfo)
      const buffer = Buffer.from(message, 'utf8')

      // 发送到广播地址
      this.socket.send(
        buffer,
        0,
        buffer.length,
        BROADCAST_PORT,
        '255.255.255.255',
        (error: any) => {
          if (error) {
            console.error('❌ UDP 广播发送失败:', error)
          } else {
            console.log(
              `📡 广播成功: ${this.roomInfo?.roomName} -> 255.255.255.255:${BROADCAST_PORT} (${buffer.length} bytes)`,
            )
          }
        },
      )
    } catch (error) {
      console.error('❌ 广播消息异常:', error)
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
  }
}

export const udpBroadcastService = new UDPBroadcastService()
