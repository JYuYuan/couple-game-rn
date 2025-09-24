import Redis from 'ioredis'

const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  // password: '你的密码', // 如果有密码
})

export default redis