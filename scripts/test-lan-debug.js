#!/usr/bin/env node
/**
 * LAN 调试脚本 - 用于调试TCP消息流程
 *
 * 这个脚本会显示详细的消息收发日志，帮助定位问题
 */

const net = require('net')
const { randomUUID } = require('crypto')

// 配置
const CONFIG = {
  host: '192.168.21.210', // 修改为你的房主IP
  port: 3306,
  roomId: '2V5SPE', // 修改为你的房间ID
  playerId: randomUUID(),
  playerName: '调试测试',
}

console.log('🐛 启动 LAN 调试脚本')
console.log('配置:', JSON.stringify(CONFIG, null, 2))
console.log()

let messageBuffer = ''
const socket = new net.Socket()

// 连接成功
socket.on('connect', () => {
  console.log('✅ TCP 连接建立\n')

  // 步骤1: 发送初始化消息
  console.log('===== 步骤 1: 发送初始化消息 =====')
  const initMessage = {
    type: 'event',
    event: 'client:init',
    playerId: CONFIG.playerId,
    data: { playerId: CONFIG.playerId },
  }
  console.log('发送消息:', JSON.stringify(initMessage, null, 2))
  sendMessage(initMessage)

  // 步骤2: 等待后发送加入房间请求
  setTimeout(() => {
    console.log('\n===== 步骤 2: 发送加入房间请求 =====')
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`
    const joinMessage = {
      type: 'event',
      event: 'room:join',
      playerId: CONFIG.playerId,
      requestId: requestId,
      data: {
        roomId: CONFIG.roomId,
        playerName: CONFIG.playerName,
        avatar: '',
        gender: 'man',
      },
    }
    console.log('发送消息:', JSON.stringify(joinMessage, null, 2))
    sendMessage(joinMessage)
    console.log(`RequestId: ${requestId}`)
    console.log('等待服务器响应...\n')
  }, 1000)
})

// 接收数据
socket.on('data', (data) => {
  messageBuffer += data.toString()

  // 处理粘包
  let newlineIndex
  while ((newlineIndex = messageBuffer.indexOf('\n')) !== -1) {
    const messageStr = messageBuffer.substring(0, newlineIndex)
    messageBuffer = messageBuffer.substring(newlineIndex + 1)

    if (messageStr.trim()) {
      console.log('\n===== 收到服务器消息 =====')
      console.log('原始字符串长度:', messageStr.length)

      try {
        const message = JSON.parse(messageStr)
        console.log('解析后的消息:', JSON.stringify(message, null, 2))

        // 分析消息类型
        if (message.type === 'event') {
          console.log(`\n📨 事件类型: ${message.event}`)
          if (message.event === 'server:init_ack') {
            console.log('✅ 初始化确认收到')
          }
        } else if (message.type === 'response') {
          console.log(`\n✅ 响应消息 (requestId: ${message.requestId})`)
          if (message.data) {
            console.log('响应数据键:', Object.keys(message.data))
            if (message.data.id) {
              console.log('  房间ID:', message.data.id)
            }
            if (message.data.players) {
              console.log('  玩家数量:', message.data.players.length)
              console.log('  玩家列表:')
              message.data.players.forEach((p, i) => {
                console.log(`    ${i + 1}. ${p.name} (${p.playerId?.substring(0, 8)})`)
              })
            }
          }
        } else if (message.type === 'broadcast') {
          console.log(`\n📡 广播消息: ${message.event}`)
        } else if (message.type === 'error') {
          console.log(`\n❌ 错误消息`)
          console.log('错误内容:', message.data || message.error)
        } else {
          console.log(`\n⚠️ 未知消息类型: ${message.type}`)
        }
      } catch (err) {
        console.error('❌ 解析消息失败:', err.message)
        console.log('原始消息:', messageStr)
      }
    }
  }
})

// 连接关闭
socket.on('close', () => {
  console.log('\n⚠️ 连接已关闭')
  process.exit(0)
})

// 连接错误
socket.on('error', (err) => {
  console.error('❌ TCP 错误:', err.message)
  process.exit(1)
})

// 发送消息
function sendMessage(message) {
  const messageStr = JSON.stringify(message) + '\n'
  console.log('发送字节数:', messageStr.length)
  socket.write(messageStr)
  console.log('✅ 消息已发送')
}

// 连接到服务器
console.log(`🔌 正在连接到 ${CONFIG.host}:${CONFIG.port}...\n`)
socket.connect(CONFIG.port, CONFIG.host)

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 正在退出...')
  socket.destroy()
  process.exit(0)
})

// 30秒后自动退出（如果没有收到响应）
setTimeout(() => {
  console.log('\n\n⏰ 30秒超时，未收到响应')
  console.log('可能的问题:')
  console.log('  1. 服务器未正确处理 room:join 事件')
  console.log('  2. requestId 不匹配')
  console.log('  3. 房间ID不存在')
  console.log('  4. 服务器端有错误但未发送响应')
  socket.destroy()
  process.exit(1)
}, 30000)
