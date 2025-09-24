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

// 注册 socket.io 的所有事件
registerSocketHandlers(io)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Socket.io 游戏服务器已启动: http://localhost:${PORT}`)
})
