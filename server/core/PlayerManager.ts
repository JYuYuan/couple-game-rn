import redis from './redisClient.js'
import { getRandomColor } from '../utils/index.js'
import type { Player } from '../typings/socket'

interface AddPlayerParams {
  playerId: string
  roomId?: string | null
  name: string
  isHost?: boolean
  [key: string]: unknown
}

class PlayerManager {
  hashKey = 'players'

  async addPlayer(
    socketId: string,
    { playerId, roomId, name, isHost, ...rest }: AddPlayerParams,
  ): Promise<Player> {
    const player: Player = {
      id: playerId, // 一律用 id
      socketId,
      roomId: roomId || null,
      name,
      color: getRandomColor(),
      isHost: !!isHost,
      isConnected: true,
      joinedAt: Date.now(), // 存时间戳
      lastSeen: Date.now(),
      position: 0, // 统一初始化位置
      score: 0, // 统一初始化分数
      playerId, // 为了兼容性
      ...rest,
    } as Player
    await redis.hset(this.hashKey, player.id, JSON.stringify(player))
    return player
  }

  async updatePlayer(player: Player): Promise<Player> {
    if (!player.id) throw new Error('player.id 缺失')
    player.lastSeen = Date.now()
    await redis.hset(this.hashKey, player.id, JSON.stringify(player))
    return player
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const data = await redis.hget(this.hashKey, playerId)
    return data ? JSON.parse(data) : null
  }

  async getAllPlayers(): Promise<Player[]> {
    const players = await redis.hgetall(this.hashKey)
    return Object.values(players).map((v: string) => JSON.parse(v))
  }

  async removePlayer(playerId: string): Promise<void> {
    await redis.hdel(this.hashKey, playerId)
  }

  async clearAll(): Promise<void> {
    await redis.del(this.hashKey)
  }

  async cleanupInactivePlayers(timeoutMs: number = 10 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const players = await this.getAllPlayers()
    for (const player of players) {
      if (!player.isConnected && now - player.lastSeen > timeoutMs) {
        this.removePlayer(player.id)
      }
    }
  }
}

export default new PlayerManager()
