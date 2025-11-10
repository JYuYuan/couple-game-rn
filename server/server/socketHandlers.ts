// socketHandlers.ts
import type {
  GameData,
  JoinData,
  PlayerInfo,
  RoomInfo,
  SocketIOServer,
  SocketIOSocket,
} from '../typings/socket'
import roomManager from '../core/RoomManager.js'
import playerManager from '../core/PlayerManager.js'
import gameInstanceManager from '../core/GameInstanceManager.js'

export default function registerSocketHandlers(io: SocketIOServer) {
  io.removeAllListeners('connection')

  io.on('connection', async (socket: SocketIOSocket) => {
    const playerId = socket.handshake.query.playerId as string
    console.log(`玩家连接: ${playerId}`, socket.id)

    // 尝试获取已存在的玩家信息
    let player = await playerManager.getPlayer(playerId)

    if (player) {
      // 更新 socketId，保证断线重连后能正常通信
      player.socketId = socket.id
      player.isConnected = true
      await playerManager.updatePlayer(player)

      console.log(`🔄 玩家 ${playerId} 重新连接，恢复状态`)
      // 如果玩家在房间
      if (player.roomId) {
        const room = await roomManager.getRoom(player.roomId)
        if (room) {
          socket.join(room.id)

          // 更新房间中的玩家信息
          const playerIndex = room.players.findIndex((p) => p.id === playerId)
          if (playerIndex !== -1) {
            room.players[playerIndex] = player
            await roomManager.updateRoom(room)
          }

          // 通知房间内其他玩家该玩家已重连
          socket.to(room.id).emit('player:reconnected', {
            playerId: playerId,
            playerName: player.name,
          })

          // 如果房间有游戏在进行，继续游戏
          const game = await gameInstanceManager.getGameInstance(player.roomId, io)
          if (game && room.gameStatus === 'playing') {
            console.log(`🎮 玩家 ${playerId} 重新连接，继续游戏`)
            socket.emit('room:update', room)
            await game.onResume()
          } else {
            await roomManager.deleteRoom(player.roomId)
            socket.emit('room:update', null)
          }
        } else {
          // 房间不存在，清理玩家的房间信息
          console.log(`⚠️ 玩家 ${playerId} 的房间 ${player.roomId} 不存在，清理状态`)
          player.roomId = null
          await playerManager.updatePlayer(player)
        }
      } else {
        socket.emit('room:update', null)
      }
    }

    // 玩家加入
    socket.on('player:join', async (playerInfo: PlayerInfo) => {
      try {
        const player = await playerManager.addPlayer(playerId, {
          playerId,
          roomId: null,
          isHost: false,
          ...playerInfo,
        })

        console.log(`玩家加入:`, player)
        io.emit('player:list', await playerManager.getAllPlayers())
      } catch (error) {
        console.error('玩家加入失败:', error)
      }
    })

    // 创建房间
    socket.on('room:create', async (roomInfo: RoomInfo) => {
      try {
        // 获取或创建玩家
        let player = await playerManager.getPlayer(playerId)
        if (!player) {
          player = await playerManager.addPlayer(playerId, {
            playerId,
            name: roomInfo.playerName,
            roomId: null,
            isHost: true,
            ...roomInfo,
          })
        } else {
          // 更新玩家信息
          player.name = roomInfo.playerName
          player.isHost = true
          player.avatarId = roomInfo.avatarId || ''
          player.gender = roomInfo.gender || 'man'
          await playerManager.updatePlayer(player)
        }

        let room = await roomManager.createRoom({
          name: roomInfo.roomName || `Room_${Date.now()}`,
          hostId: playerId,
          maxPlayers: roomInfo.maxPlayers || 2,
          gameType: roomInfo.gameType || 'fly',
          taskSet: roomInfo.taskSet || null,
        })

        // 将创建者加入房间
        const roomResult = await roomManager.addPlayerToRoom(room.id, player)
        if (!roomResult) {
          throw new Error('Failed to add player to room')
        }
        room = roomResult
        player.roomId = room.id

        await playerManager.updatePlayer(player)

        socket.join(room.id)
        console.log(`房间创建: ${room.id}`)
        io.to(room.id).emit('room:update', room)
      } catch (error) {
        console.log(error)
        socket.emit('error', { message: (error as Error).message })
      }
    })

    // 加入房间
    socket.on('room:join', async (joinData: JoinData) => {
      try {
        const roomId = joinData.roomId
        let room = await roomManager.getRoom(roomId)
        if (!room) {
          return socket.emit('error', { message: '房间不存在或已满' })
        }

        // 获取或创建玩家
        let player = await playerManager.getPlayer(playerId)
        if (!player) {
          player = await playerManager.addPlayer(playerId, {
            playerId,
            name: joinData.playerName || `Player_${playerId.substring(0, 6)}`,
            isHost: false,
            ...joinData,
          })
        } else {
          // 更新玩家信息
          player.name = joinData.playerName || player.name
          player.isHost = false
          player.avatarId = joinData.avatarId || ''
          player.gender = joinData.gender || 'man'
          await playerManager.updatePlayer(player)
        }

        room = await roomManager.addPlayerToRoom(roomId, player)
        if (!room) {
          return socket.emit('error', { message: '房间不存在或已满' })
        }

        player.roomId = room.id
        await playerManager.updatePlayer(player)

        socket.join(roomId)
        console.log(`玩家 ${player.id} 加入房间 ${roomId}`)

        io.to(roomId).emit('room:update', room)
      } catch (error) {
        console.log(error)
        socket.emit('error', { message: (error as Error).message })
      }
    })

    // 开始游戏
    socket.on('game:start', async (data: GameData) => {
      try {
        const room = await roomManager.getRoom(data.roomId)
        if (!room) {
          return socket.emit('error', { message: '房间不存在' })
        }

        const player = await playerManager.getPlayer(playerId)

        if (!player || !player.isHost) {
          return socket.emit('error', { message: '只有房主可以开始游戏' })
        }

        if (room.players.length < 2) {
          return socket.emit('error', { message: '至少需要2个玩家才能开始游戏' })
        }

        // 创建游戏实例
        const game = await gameInstanceManager.createGameInstance(room, io)

        if (!game) {
          return socket.emit('error', { message: '游戏创建失败' })
        }

        game.onStart()
      } catch (error) {
        socket.emit('error', { message: (error as Error).message })
      }
    })

    // 游戏动作（投骰子、移动等）
    socket.on('game:action', async (data: GameData, callback?: Function) => {
      try {
        const game = await gameInstanceManager.getGameInstance(data.roomId, io)
        if (!game) {
          const error = { message: '游戏不存在' }
          socket.emit('error', error)
          await roomManager.deleteRoom(data.roomId)
          callback?.({ success: false, error: error.message })
          return
        }

        // 传递回调函数给游戏实例
        await game.onPlayerAction(io, playerId, data, callback)

        // 更新游戏状态到 Redis
        await gameInstanceManager.updateGameInstance(data.roomId, game)
      } catch (error) {
        const errorMessage = (error as Error).message
        socket.emit('error', { message: errorMessage })
        callback?.({ success: false, error: errorMessage })
      }
    })

    // 离开房间
    socket.on('room:leave', async (data: { roomId?: string }) => {
      try {
        const player = await playerManager.getPlayer(playerId)
        if (!player || !player.roomId) {
          return socket.emit('error', { message: '玩家不在任何房间中' })
        }

        const room = await roomManager.getRoom(player.roomId)
        if (!room) {
          return socket.emit('error', { message: '房间不存在' })
        }

        const isHost = room.hostId === playerId
        const roomId = room.id

        console.log(
          `玩家 ${playerId} 离开房间 ${roomId}, 是否为房主: ${isHost}, 当前房间人数: ${room.players.length}`,
        )

        // 如果是房主离开
        if (isHost) {
          console.log(`房主离开房间，销毁房间 ${roomId}`)

          // 通知所有玩家房间被销毁
          io.to(roomId).emit('room:destroyed', {
            reason: 'host_left',
            message: '房主已离开，房间已关闭',
          })

          // 让所有玩家离开socket房间
          const sockets = await io.in(roomId).fetchSockets()
          for (const s of sockets) {
            s.leave(roomId)
          }

          // 清理所有玩家的房间信息
          for (const p of room.players) {
            const playerData = await playerManager.getPlayer(p.id)
            if (playerData) {
              playerData.roomId = null
              await playerManager.updatePlayer(playerData)
            }
          }

          // 清理游戏实例
          await gameInstanceManager.removeGameInstance(roomId)

          // 删除房间
          await roomManager.deleteRoom(roomId)

          console.log(`房间 ${roomId} 已销毁`)
        } else {
          // 普通玩家离开
          const updatedRoom = await roomManager.removePlayerFromRoom(roomId, playerId)

          // 清理玩家的房间信息
          player.roomId = null
          await playerManager.updatePlayer(player)

          socket.leave(roomId)
          console.log(`玩家 ${playerId} 离开房间 ${roomId}`)

          if (updatedRoom) {
            // 如果房间还有玩家，更新房间状态
            io.to(roomId).emit('room:update', updatedRoom)

            // 如果只剩一个玩家，游戏退回到等待状态
            if (updatedRoom.players.length === 1 && updatedRoom.gameStatus === 'playing') {
              console.log(`房间 ${roomId} 只剩一个玩家，游戏退回到等待状态`)
              updatedRoom.gameStatus = 'waiting'
              await roomManager.updateRoom(updatedRoom)

              // 清理游戏实例
              await gameInstanceManager.removeGameInstance(roomId)

              io.to(roomId).emit('room:update', updatedRoom)
            }
          } else {
            // 房间已空，游戏实例已被清理
            console.log(`所有玩家离开房间，房间 ${roomId} 已删除`)
            await gameInstanceManager.removeGameInstance(roomId)
          }
        }
      } catch (error) {
        console.error('离开房间失败:', error)
        socket.emit('error', { message: (error as Error).message })
      }
    })

    // 获取房间列表
    socket.on('room:list', async () => {
      const rooms = await roomManager.getAllRooms()
      socket.emit('room:list', rooms)
    })

    // 获取房间列表 (别名)
    socket.on('room:getRoomList', async () => {
      const rooms = await roomManager.getAllRooms()
      socket.emit('room:list', rooms)
    })

    // 获取玩家列表
    socket.on('player:list', async () => {
      const players = await playerManager.getAllPlayers()
      socket.emit('player:list', players)
    })

    // 断开连接
    socket.on('disconnect', async () => {
      const player = await playerManager.getPlayer(playerId)
      if (player) {
        console.log(`玩家断开: ${player.id}`, socket.id)
      }
    })

    // 错误处理
    socket.on('error', (error: Error) => {
      console.error(`Socket错误 ${playerId}:`, error)
    })

    socket.onAny((event, ...args) => {
      console.log('收到事件:', event, args)
    })
  })

  // 定期清理不活跃的房间、玩家和游戏
  setInterval(
    async () => {
      await roomManager.cleanupInactiveRooms()
      await playerManager.cleanupInactivePlayers()
      await gameInstanceManager.cleanupExpiredGames()
    },
    5 * 60 * 1000,
  ) // 每5分钟清理一次
}
