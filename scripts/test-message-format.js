#!/usr/bin/env node
/**
 * 测试消息格式
 */

const { randomUUID } = require('crypto')

const playerId = '0e4b7a56-3d3f-42f8-9212-ae6f8e62aec5'
const requestId = '1761544166485_az1pq'
const roomId = '6W1YIP'

const message = {
  type: 'event',
  event: 'room:join',
  playerId: playerId,
  requestId: requestId,
  data: {
    roomId: roomId,
    playerName: '测试玩家',
    avatar: '',
    gender: 'man',
  },
}

console.log('消息对象:')
console.log(message)
console.log()

const messageStr = JSON.stringify(message)
console.log('JSON 字符串:')
console.log(messageStr)
console.log()

console.log('JSON 字符串长度:', messageStr.length)
console.log()

// 验证 JSON
try {
  const parsed = JSON.parse(messageStr)
  console.log('✅ JSON 有效')
  console.log('解析后的 playerName:', parsed.data.playerName)
  console.log('解析后的 avatar:', parsed.data.avatar)
} catch (err) {
  console.error('❌ JSON 无效:', err.message)
}

console.log()
console.log('带换行符的消息:')
const withNewline = messageStr + '\n'
console.log('长度:', withNewline.length)
console.log('内容:')
console.log(withNewline)