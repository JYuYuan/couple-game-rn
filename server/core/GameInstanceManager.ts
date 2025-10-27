import redis from './redisClient.js'
import GameRegistry from './GameRegistry.js'
import roomManager from './RoomManager.js'
import type { Room, SocketIOServer } from '../typings/socket'

class GameInstanceManager {
  private hashKey = 'games'
  private localCache = new Map() // 本地缓存游戏实例
  private readonly GAME_TTL = 2 * 60 * 60 * 1000 // 2小时过期时间

  /**
   * 创建游戏实例
   */
  async createGameInstance(room: Room, io: SocketIOServer): Promise<any> {
    const game = GameRegistry.createGame(room.gameType, room, io)
    if (!game) {
      throw new Error(`不支持的游戏类型: ${room.gameType}`)
    }

    // 直接使用 room 数据，游戏状态已经在 room.gameState 中
    await redis.hset(this.hashKey, room.id, JSON.stringify({
      roomId: room.id,
      gameType: room.gameType,
      createdAt: Date.now(),
      lastActivity: Date.now()
    }))

    await redis.expire(this.hashKey, this.GAME_TTL / 1000)

    // 本地缓存游戏实例
    this.localCache.set(room.id, game)

    return game
  }

  /**
   * 获取游戏实例
   */
  async getGameInstance(roomId: string, io?: SocketIOServer): Promise<any> {
    // 先从本地缓存查找
    if (this.localCache.has(roomId)) {
      return this.localCache.get(roomId)
    }

    // 从 Redis 检查游戏是否存在
    const gameDataStr = await redis.hget(this.hashKey, roomId)
    if (!gameDataStr) {
      return null
    }

    // 从 roomManager 获取最新的 room 数据
    const room = await roomManager.getRoom(roomId)
    if (!room) {
      // 清理无效的游戏记录
      await redis.hdel(this.hashKey, roomId)
      return null
    }

    // 重建游戏实例
    const game = this.recreateGameInstance(room, io)
    if (game) {
      this.localCache.set(roomId, game)
    }

    return game
  }

  /**
   * 更新游戏实例状态
   */
  async updateGameInstance(roomId: string, _game: any): Promise<void> {
    // 更新游戏实例的最后活动时间
    const gameData = { roomId, lastActivity: Date.now() }
    try {
      await redis.hset(this.hashKey, roomId, JSON.stringify(gameData))
    } catch (error) {
      console.warn('Failed to update game instance in Redis:', error)
    }
  }

  /**
   * 删除游戏实例
   */
  async removeGameInstance(roomId: string): Promise<void> {
    await redis.hdel(this.hashKey, roomId)
    this.localCache.delete(roomId)
  }

  /**
   * 获取所有活跃游戏
   */
  async getAllActiveGames(): Promise<{ [roomId: string]: any }> {
    const games = await redis.hgetall(this.hashKey)
    const parsedGames = Object.fromEntries(
      Object.entries(games).map(([key, value]) => [key, JSON.parse(value)])
    )
    return parsedGames
  }

  /**
   * 清理过期游戏
   */
  async cleanupExpiredGames(): Promise<void> {
    const now = Date.now()
    const games = await this.getAllActiveGames()

    for (const [roomId, gameData] of Object.entries(games)) {
      if (now - gameData.lastActivity > this.GAME_TTL) {
        await this.removeGameInstance(roomId)
        console.log(`清理过期游戏: ${roomId}`)
      }
    }
  }

  /**
   * 从 room 数据重建游戏实例
   */
  private recreateGameInstance(room: Room, io?: SocketIOServer): any {
    if (!io) {
      console.warn('无法重建游戏实例：缺少 io 参数')
      return null
    }

    // 直接使用 room 数据创建游戏实例
    const game = GameRegistry.createGame(room.gameType, room, io)
    return game
  }

  /**
   * 清空本地缓存
   */
  clearLocalCache(): void {
    this.localCache.clear()
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { localCacheSize: number, redisKey: string } {
    return {
      localCacheSize: this.localCache.size,
      redisKey: this.hashKey
    }
  }
}

export default new GameInstanceManager()