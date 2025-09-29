import { v4 as uuidv4 } from 'uuid'
import redis from './redisClient.js'
import type { Room, Player } from '../typings/socket'

interface CreateRoomParams {
  name: string
  hostId: string
  maxPlayers?: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  [key: string]: any
}

class RoomManager {
  hashKey = 'rooms'
  /**
   * 创建房间
   */
  async createRoom({ name, hostId, maxPlayers = 4, gameType,...rest }: CreateRoomParams): Promise<Room> {
    const roomId = uuidv4().slice(0, 6).toUpperCase()
    const room: Room = {
      id: roomId,
      name,
      hostId,
      players: [],
      maxPlayers,
      gameStatus: 'waiting' as const,
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
  async deleteRoom(roomId: string): Promise<void> {
    await redis.hdel(this.hashKey, `${roomId}`)
  }

  async updateRoom(room: Room): Promise<void> {
    await redis.hset(this.hashKey, `${room.id}`, JSON.stringify(room))
  }

  /**
   * 获取房间
   */
  async getRoom(roomId: string): Promise<Room | null> {
    const data = await redis.hget(this.hashKey, `${roomId}`)
    return data ? JSON.parse(data) : null
  }

  /**
   * 添加玩家
   */
  async addPlayer(roomId: string, player: Player): Promise<Room | null> {
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
  async removePlayer(roomId: string, playerId: string): Promise<Room | null> {
    const room = await this.getRoom(roomId)
    if (!room) return null
    room.players = room.players.filter((p) => p.playerId !== playerId)
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0]?.playerId || room.players[0]?.id || ''
      room.players.forEach((p: Player) => (p.isHost = false))
      room.players[0]!.isHost = true
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
  async addPlayerToRoom(roomId: string, player: Player): Promise<Room | null> {
    const room = await this.getRoom(roomId)
    if (!room) return null
    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }
    player.roomId = roomId

    // 初始化玩家位置
    player.position = 0

    // 初始化房间的gameState（如果不存在）
    if (!room.gameState) {
      room.gameState = {
        playerPositions: {},
        turnCount: 0,
        gamePhase: 'waiting',
        startTime: Date.now(),
        boardSize: room.boardPath?.length || 0
      }
    }

    // 设置玩家初始位置
    room.gameState.playerPositions[player.id] = 0

    room.players.push(player)
    room.lastActivity = Date.now()
    await this.updateRoom(room)
    return room
  }

  /**
   * 从房间移除玩家
   */
  async removePlayerFromRoom(roomId: string, playerId: string): Promise<Room | null> {
    const room = await this.getRoom(roomId)
    console.log(roomId)
    if (!room) return null
    room.players = room.players.filter((p) => p.playerId !== playerId)
    
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0]?.playerId || room.players[0]?.id || ''
      room.players.forEach((p: Player) => (p.isHost = false))
      room.players[0]!.isHost = true
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
   * 从所有房间移除玩家
   */
  async removePlayerFromRooms(playerId: string): Promise<Room | null> {
    const roomIds = await redis.smembers('')
    for (const roomId of roomIds) {
      const room = await this.getRoom(roomId)
      if (room && room.players.some((p: Player) => p.playerId === playerId)) {
        return await this.removePlayerFromRoom(roomId, playerId)
      }
    }
    return null
  }

  /**
   * 获取所有房间
   */
  async getAllRooms(): Promise<{ [key: string]: Room }> {
    const rooms = await redis.hgetall(this.hashKey)
    const parsedRooms = Object.fromEntries(
      Object.entries(rooms).map(([key, value]) => [key, JSON.parse(value)]),
    )
    return parsedRooms
  }

  /**
   * 更新房间活跃时间
   */
  async touchRoom(roomId: string): Promise<void> {
    const room = await this.getRoom(roomId)
    if (room) {
      room.lastActivity = Date.now()
      await redis.hset(this.hashKey, `${roomId}`, JSON.stringify(room))
    }
  }

  /**
   * 清理超时房间
   */
  async cleanupInactiveRooms(timeoutMs: number = 30 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const rooms = await this.getAllRooms()
    for (const room of Object.values(rooms) as Room[]) {
      if (room && now - room.lastActivity > timeoutMs) {
        await this.deleteRoom(room.id)
      }
    }
  }
}

export default new RoomManager()
