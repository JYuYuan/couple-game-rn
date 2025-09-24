import { v4 as uuidv4 } from 'uuid'
import redis from './redisClient.js'

class RoomManager {
  hashKey = 'rooms'
  /**
   * 创建房间
   */
  async createRoom({ name, hostId, maxPlayers = 4, gameType,...rest }) {
    const roomId = uuidv4().slice(0, 6).toUpperCase()
    const room = {
      id: roomId,
      name,
      hostId,
      players: [],
      maxPlayers,
      gameStatus: 'waiting',
      gameType,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      engine: null,
      ...rest,
    }
    await redis.hset(this.hashKey, `${roomId}`, JSON.stringify(room))
    return room
  }

  /**
   * 删除房间
   */
  async deleteRoom(roomId) {
    await redis.hdel(this.hashKey, `${roomId}`)
  }

  async updateRoom(room) {
    await redis.hset(this.hashKey, `${room.id}`, JSON.stringify(room))
  }

  /**
   * 获取房间
   */
  async getRoom(roomId) {
    const data = await redis.hget(this.hashKey, `${roomId}`)
    return data ? JSON.parse(data) : null
  }

  /**
   * 添加玩家
   */
  async addPlayer(roomId, player) {
    const room = await this.getRoom(roomId)
    if (!room) return null
    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }
    room.players.push(player)
    room.lastActivity = Date.now()
    await redis.hset(this.hashKey, `${roomId}`, JSON.stringify(room))
    return room
  }

  /**
   * 移除玩家
   */
  async removePlayer(roomId, playerId) {
    const room = await this.getRoom(roomId)
    if (!room) return null
    room.players = room.players.filter((p) => p.playerId !== playerId)
    if (room.playerId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].socketId
      room.players.forEach((p) => (p.isHost = false))
      room.players[0].isHost = true
    }
    if (room.players.length === 0) {
      await this.deleteRoom(roomId)
      return null
    }
    room.lastActivity = Date.now()
    await redis.hset(this.hashKey, `${roomId}`, JSON.stringify(room))
    return room
  }

  /**
   * 添加玩家到房间
   */
  async addPlayerToRoom(roomId, player) {
    const room = await this.getRoom(roomId)
    if (!room) return null
    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }
    player.roomId = roomId
    room.players.push(player)
    room.lastActivity = Date.now()
    await redis.hset(this.hashKey, `${roomId}`, JSON.stringify(room))
    return room
  }

  /**
   * 从房间移除玩家
   */
  async removePlayerFromRoom(roomId, playerId) {
    const room = await this.getRoom(roomId)
    if (!room) return null
    room.players = room.players.filter((p) => p.playerId !== playerId)
    if (room.playerId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].socketId
      room.players.forEach((p) => (p.isHost = false))
      room.players[0].isHost = true
    }
    if (room.players.length === 0) {
      await this.deleteRoom(roomId)
      return null
    }
    room.lastActivity = Date.now()
    await redis.set(this.hashKey, `${roomId}`, JSON.stringify(room))
    return room
  }

  /**
   * 从所有房间移除玩家
   */
  async removePlayerFromRooms(playerId) {
    const roomIds = await redis.smembers('')
    for (const roomId of roomIds) {
      const room = await this.getRoom(roomId)
      if (room && room.players.some((p) => p.playerId === playerId)) {
        return await this.removePlayerFromRoom(roomId, playerId)
      }
    }
    return null
  }

  /**
   * 获取所有房间
   */
  async getAllRooms() {
    const rooms = await redis.hgetall(this.hashKey)
    const parsedRooms = Object.fromEntries(
      Object.entries(rooms).map(([key, value]) => [key, JSON.parse(value)]),
    )
    return parsedRooms
  }

  /**
   * 更新房间活跃时间
   */
  async touchRoom(roomId) {
    const room = await this.getRoom(roomId)
    if (room) {
      room.lastActivity = Date.now()
      await redis.set(this.hashKey, `${roomId}`, JSON.stringify(room))
    }
  }

  /**
   * 清理超时房间
   */
  async cleanupInactiveRooms(timeoutMs = 30 * 60 * 1000) {
    const now = Date.now()
    const rooms = await this.getAllRooms()
    for (const room of Object.values(rooms)) {
      if (room && now - room.lastActivity > timeoutMs) {
        await this.deleteRoom(room.roomId)
      }
    }
  }
}

export default new RoomManager()
