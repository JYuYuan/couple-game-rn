// index.js
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import registerSocketHandlers from './server/socketHandlers.js'
import GameRegistry from './core/GameRegistry.js'

// ====== 注册游戏类型 ======
import FlightChessGame from './games/flying/index.js'

// 注册到 GameRegistry
GameRegistry.registerGame('fly', FlightChessGame)

// ====== 启动服务 ======
const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// ====== Express 路由 ======
// 健康检查端点（用于部署平台监控）
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Couple Game Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// 服务器统计信息（可选）
app.get('/stats', (req, res) => {
  const connectedClients = io.engine.clientsCount
  res.json({
    connectedClients,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

// 注册 socket.io 的所有事件
registerSocketHandlers(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Socket.io 游戏服务器已启动: http://localhost:${PORT}`)
  console.log(`📊 健康检查端点: http://localhost:${PORT}/health`)
  console.log(`📈 统计信息端点: http://localhost:${PORT}/stats`)
})
