#!/usr/bin/env node
/**
 * LAN 简化测试脚本 - 调试版本
 */

const dgram = require('dgram')
const net = require('net')
const { randomUUID } = require('crypto')

// ============ 配置区域 ============
const CONFIG = {
  udpPort: 8888,
  scanTimeout: 10000,
  tcpHost: null,
  tcpPort: 3306,
  playerId: randomUUID(),
  playerName: '测试玩家',
  roomId: null,
  mode: 'join',
}
// ================================

console.log('🚀 启动 LAN 简化测试脚本 (调试版)\n')
console.log('配置:', CONFIG.mode, '-', CONFIG.playerName, '-', CONFIG.playerId.substring(0, 8))
console.log()

/**
 * 扫描房间
 */
function scanRooms() {
  return new Promise((resolve) => {
    const rooms = new Map()
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    console.log(`🎧 开始扫描局域网房间 (UDP ${CONFIG.udpPort})...`)

    socket.on('message', (msg) => {
      try {
        const room = JSON.parse(msg.toString())
        if (!rooms.has(room.roomId)) {
          console.log(`✨ 发现房间: "${room.roomName}" (${room.hostIP}:${room.tcpPort})`)
          rooms.set(room.roomId, room)
        }
      } catch (err) {
        // 忽略无效消息
      }
    })

    socket.on('error', (err) => {
      console.error('❌ UDP 错误:', err.message)
      resolve([])
    })

    socket.bind(CONFIG.udpPort, () => {
      console.log(`✅ UDP Socket 已绑定到端口 ${CONFIG.udpPort}\n`)

      setTimeout(() => {
        socket.close()
        const roomList = Array.from(rooms.values())
        console.log(`\n⏹️  扫描结束,共发现 ${roomList.length} 个房间\n`)
        resolve(roomList)
      }, CONFIG.scanTimeout)
    })
  })
}

/**
 * 发送消息 - 带详细调试
 */
function sendMessage(socket, message, label = '') {
  console.log(`\n🐛 [sendMessage${label ? ' - ' + label : ''}]`)
  console.log('  Socket 状态:')
  console.log('    destroyed:', socket.destroyed)
  console.log('    writable:', socket.writable)
  console.log('    pending:', socket.pending)
  console.log('    connecting:', socket.connecting)

  if (socket.destroyed) {
    console.error('  ❌ Socket 已销毁!')
    return false
  }

  if (!socket.writable) {
    console.error('  ❌ Socket 不可写!')
    return false
  }

  const messageStr = JSON.stringify(message) + '\n'
  console.log('  消息内容:', JSON.stringify(message))
  console.log('  消息长度:', messageStr.length, '字节')

  try {
    const canWrite = socket.write(messageStr, 'utf8', (err) => {
      if (err) {
        console.error('  ❌ 写入回调错误:', err.message)
      } else {
        console.log(`  ✅ 写入回调完成 [${label}]`)
      }
    })

    console.log('  socket.write() 返回:', canWrite)
    console.log('  bufferSize:', socket.bufferSize || 0)

    return canWrite
  } catch (err) {
    console.error('  ❌ 写入异常:', err.message)
    return false
  }
}

/**
 * 连接并加入房间
 */
function joinRoom(host, port, roomId) {
  const socket = new net.Socket()
  let messageBuffer = ''
  let messageCount = 0

  console.log(`🔌 连接到 ${host}:${port}...`)

  // 监听所有可能的事件
  socket.on('connect', () => {
    console.log('\n✅ TCP 连接建立')
    console.log('  localAddress:', socket.localAddress)
    console.log('  localPort:', socket.localPort)
    console.log()

    // 步骤 1: 发送初始化消息
    console.log('===== 步骤 1: 发送初始化消息 =====')
    const initSuccess = sendMessage(
      socket,
      {
        type: 'event',
        event: 'client:init',
        playerId: CONFIG.playerId,
        data: { playerId: CONFIG.playerId },
      },
      'INIT',
    )
    console.log('初始化消息发送结果:', initSuccess ? '✅ 成功' : '❌ 失败')

    // 步骤 2: 延迟发送加入房间请求
    setTimeout(() => {
      console.log('\n===== 步骤 2: 发送加入房间请求 (500ms 后) =====')
      console.log('🐛 setTimeout 被触发')
      console.log('  当前 Socket 状态:')
      console.log('    destroyed:', socket.destroyed)
      console.log('    writable:', socket.writable)
      console.log('    bytesWritten:', socket.bytesWritten)
      console.log('    bytesRead:', socket.bytesRead)

      if (socket.destroyed || !socket.writable) {
        console.error('❌ Socket 状态异常，无法发送!')
        return
      }

      const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`
      const joinSuccess = sendMessage(
        socket,
        {
          type: 'event',
          event: 'room:join',
          playerId: CONFIG.playerId,
          requestId: requestId,
          data: {
            roomId: roomId,
            playerName: CONFIG.playerName,
            avatarId: 'g1-7KQTv8t5.png', // 修正: 使用 avatar 而不是 avatarId
            gender: 'man',
          },
        },
        'JOIN',
      )
      console.log('加入房间消息发送结果:', joinSuccess ? '✅ 成功' : '❌ 失败')
      console.log('RequestId:', requestId)
    }, 500)
  })

  socket.on('data', (data) => {
    messageCount++
    console.log(`\n📨 收到数据 #${messageCount} (${data.length} 字节)`)

    messageBuffer += data.toString()

    // 处理粘包
    let newlineIndex
    while ((newlineIndex = messageBuffer.indexOf('\n')) !== -1) {
      const messageStr = messageBuffer.substring(0, newlineIndex)
      messageBuffer = messageBuffer.substring(newlineIndex + 1)

      if (messageStr.trim()) {
        try {
          const message = JSON.parse(messageStr)
          console.log('  类型:', message.type)
          console.log('  事件:', message.event || '-')
          if (message.requestId) {
            console.log('  requestId:', message.requestId)
          }
          if (message.data) {
            console.log('  数据键:', Object.keys(message.data).join(', '))
          }
        } catch (err) {
          console.error('  ❌ 解析失败:', err.message)
          console.log('  原始:', messageStr.substring(0, 100))
        }
      }
    }
  })

  socket.on('drain', () => {
    console.log('🐛 [drain] 发送缓冲区已清空')
  })

  socket.on('close', (hadError) => {
    console.log('\n⚠️  连接已关闭')
    console.log('  hadError:', hadError)
    console.log('  bytesWritten:', socket.bytesWritten)
    console.log('  bytesRead:', socket.bytesRead)
    process.exit(0)
  })

  socket.on('error', (err) => {
    console.error('\n❌ TCP 错误:', err.message)
    console.error('  错误码:', err.code)
    console.error('  错误详情:', err)
    process.exit(1)
  })

  socket.on('end', () => {
    console.log('\n⚠️  服务端关闭了连接 (FIN)')
  })

  socket.on('timeout', () => {
    console.log('\n⚠️  Socket 超时')
  })

  socket.connect(port, host)

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n\n👋 正在退出...')
    socket.destroy()
    process.exit(0)
  })
}

/**
 * 主函数
 */
async function main() {
  try {
    if (CONFIG.mode === 'scan') {
      await scanRooms()
    } else if (CONFIG.mode === 'join') {
      const rooms = await scanRooms()

      if (rooms.length === 0) {
        console.log('⚠️  没有发现任何房间')
        process.exit(0)
      }

      const room = rooms[0]
      console.log(`🎯 选择房间: "${room.roomName}"\n`)

      const host = CONFIG.tcpHost || room.hostIP
      const port = CONFIG.tcpPort || room.tcpPort
      const roomId = CONFIG.roomId || room.roomId

      joinRoom(host, port, roomId)
    } else if (CONFIG.mode === 'direct') {
      if (!CONFIG.tcpHost || !CONFIG.roomId) {
        console.error('❌ 直接连接模式需要指定 tcpHost 和 roomId')
        process.exit(1)
      }
      joinRoom(CONFIG.tcpHost, CONFIG.tcpPort, CONFIG.roomId)
    } else {
      console.error('❌ 未知的模式:', CONFIG.mode)
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ 发生错误:', err)
    process.exit(1)
  }
}

// 运行
main()
