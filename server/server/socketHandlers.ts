// socketHandlers.ts
import type { SocketIOServer, SocketIOSocket, PlayerInfo, RoomInfo, JoinData, GameData, SocketCallback } from '../typings/socket'
import roomManager from '../core/RoomManager.js'
import playerManager from '../core/PlayerManager.js'
import GameRegistry from '../core/GameRegistry.js'

export default function registerSocketHandlers(io: SocketIOServer) {
  // 存储游戏实例
  const activeGames = new Map()
  io.removeAllListeners('connection')

  io.on('connection', async (socket: SocketIOSocket) => {
    const playerId = socket.handshake.query.playerId as string
    console.log(`玩家连接: ${playerId}`)

    // 尝试获取已存在的玩家信息
    let player = await playerManager.getPlayer(playerId)

    if (player) {
      // 更新 socketId，保证断线重连后能正常通信
      player.socketId = socket.id
      // 如果玩家在房间
      if (player.roomId) {
        const room = await roomManager.getRoom(player.roomId)
        if (room) {
          socket.join(room.id)
          socket.emit('room:update', room)
        }
      }

      // 如果玩家在游戏中
      if (player.roomId && activeGames.has(player.roomId)) {
        socket.emit('game:resume', { roomId: player.roomId })
      }
    }

    // 玩家加入
    socket.on('player:join', async (playerInfo: PlayerInfo, callback?: SocketCallback) => {
      try {
        const player = await playerManager.addPlayer(playerId, {
          playerId,
          name: playerInfo.name || `Player_${playerId.substring(0, 6)}`,
          roomId: null,
          isHost: false,
        })

        console.log(`玩家加入:`, player)
        callback?.({ success: true, player })
        io.emit('player:list', await playerManager.getAllPlayers())
      } catch (error) {
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 创建房间
    socket.on('room:create', async (roomInfo: RoomInfo, callback?: SocketCallback) => {
      try {
        const player = await playerManager.addPlayer(playerId, {
          playerId,
          name: roomInfo.playerName,
          roomId: null,
          isHost: true,
        })

        let room = await roomManager.createRoom({
          name: roomInfo.roomName || `Room_${Date.now()}`,
          hostId: playerId,
          maxPlayers: roomInfo.maxPlayers || 2,
          gameType: roomInfo.gameType || 'fly',
          taskSet: roomInfo.taskSet || null,
        })

        // // 将创建者加入房间
        const roomResult = await roomManager.addPlayerToRoom(room.id, player)
        if (!roomResult) {
          throw new Error('Failed to add player to room')
        }
        room = roomResult
        player.isHost = true
        player.roomId = room.id

        await playerManager.updatePlayer(player)

        socket.join(room.id)
        console.log(`房间创建: ${room.id}`)
        callback?.({ success: true, room })
      } catch (error) {
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 加入房间
    socket.on('room:join', async (joinData: JoinData, callback?: SocketCallback) => {
      try {
        console.log(playerId)
        const roomId = joinData.roomId
        const player = await playerManager.addPlayer(playerId, {
          playerId,
          name: joinData.playerName || `Player_${playerId.substring(0, 6)}`,
          roomId: joinData.roomId,
          isHost: false,
        })

        const room = await roomManager.addPlayerToRoom(roomId, player)

        if (!room) {
          return callback?.({ success: false, message: '房间不存在或已满' })
        }

        player.roomId = room.id
        await playerManager.updatePlayer(player)

        socket.join(roomId)
        console.log(`玩家 ${player.id} 加入房间 ${roomId}`)

        callback?.({ success: true, room })
        io.to(roomId).emit('room:update', room)
      } catch (error) {
        console.log(error)
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 开始游戏
    socket.on('game:start', async (data: GameData, callback?: SocketCallback) => {
      try {
        const room = await roomManager.getRoom(data.roomId)
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' })
        }

        const player = await playerManager.getPlayer(playerId)

        if (!player || !player.isHost) {
          return callback?.({ success: false, message: '只有房主可以开始游戏' })
        }

        if (room.players.length < 2) {
          return callback?.({ success: false, message: '至少需要2个玩家才能开始游戏' })
        }

        // 创建游戏实例
        const game = GameRegistry.createGame(room.gameType, room, io)

        if (!game) {
          return callback?.({ success: false, message: '游戏类型不支持' })
        }

        activeGames.set(room.id, game)

        game.onStart()
      } catch (error) {
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 游戏动作（投骰子、移动等）
    socket.on('game:action', (data: GameData, callback?: SocketCallback) => {
      try {
        const game = activeGames.get(data.roomId)
        if (!game) {
          return callback?.({ success: false, message: '游戏不存在' })
        }

        game.onPlayerAction(io, playerId, data)
        callback?.({ success: true })
      } catch (error) {
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 离开房间
    socket.on('room:leave', async (roomId: string, callback?: SocketCallback) => {
      try {
        const room = await roomManager.removePlayerFromRoom(roomId, playerId)
        if (room) {
          socket.leave(roomId)
          console.log(`玩家 ${playerId} 离开房间 ${roomId}`)
          io.to(roomId).emit('room:update', room)
        }

        // 清理游戏实例
        if (room && room.players.length === 0) {
          activeGames.delete(roomId)
        }

        callback?.({ success: true })
      } catch (error) {
        callback?.({ success: false, message: (error as Error).message })
      }
    })

    // 获取房间列表
    socket.on('room:list', async (callback?: SocketCallback) => {
      callback?.(await roomManager.getAllRooms())
    })

    // 获取玩家列表
    socket.on('player:list', async (callback?: SocketCallback) => {
      callback?.(await playerManager.getAllPlayers())
    })

    // 断开连接
    socket.on('disconnect', async () => {
      const player = await playerManager.getPlayer(playerId)
      if (player) {
        console.log(`玩家断开: ${player.id}`)

        // 从房间中移除
        if (player.roomId) {
          const room = await roomManager.removePlayerFromRoom(player.roomId, playerId)
          if (room) {
            io.to(player.roomId).emit('room:update', room)

            // 清理游戏实例
            if (room.players.length === 0) {
              activeGames.delete(player.roomId)
            }
          }
        }

        await playerManager.removePlayer(playerId)
        io.emit('player:list', await playerManager.getAllPlayers())
      }
    })

    // 错误处理
    socket.on('error', (error: any) => {
      console.error(`Socket错误 ${playerId}:`, error)
    })
  })

  // 定期清理不活跃的房间和玩家
  setInterval(
    async () => {
      await roomManager.cleanupInactiveRooms()
      await playerManager.cleanupInactivePlayers()
    },
    5 * 60 * 1000,
  ) // 每5分钟清理一次
}
