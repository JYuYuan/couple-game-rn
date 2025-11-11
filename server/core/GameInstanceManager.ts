import GameRegistry from './GameRegistry.js'
import roomManager from './RoomManager.js'
import type { Room, SocketIOServer } from '../typings/socket'
import type BaseGame from './BaseGame.js'

interface GameData {
  roomId: string
  gameType: string
  createdAt: number
  lastActivity: number
}

/**
 * 🐾 游戏实例管理器
 * 使用双层 Map 缓存：localCache 存储游戏实例，games 存储元数据
 */
class GameInstanceManager {
  private games = new Map<string, GameData>() // 游戏元数据
  private localCache = new Map<string, BaseGame>() // 本地缓存游戏实例
  private readonly GAME_TTL = 2 * 60 * 60 * 1000 // 2小时过期时间

  /**
   * 创建游戏实例
   */
  async createGameInstance(room: Room, io: SocketIOServer): Promise<BaseGame> {
    const game = GameRegistry.createGame(room.gameType, room, io)
    if (!game) {
      throw new Error(`不支持的游戏类型: ${room.gameType}`)
    }

    // 保存游戏元数据
    this.games.set(room.id, {
      roomId: room.id,
      gameType: room.gameType,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })

    // 本地缓存游戏实例
    this.localCache.set(room.id, game)

    return game
  }

  /**
   * 获取游戏实例
   */
  async getGameInstance(roomId: string, io?: SocketIOServer): Promise<BaseGame | null> {
    // 先从本地缓存查找
    if (this.localCache.has(roomId)) {
      return this.localCache.get(roomId) || null
    }

    // 检查游戏元数据是否存在
    const gameData = this.games.get(roomId)
    if (!gameData) {
      return null
    }

    // 从 roomManager 获取最新的 room 数据
    const room = await roomManager.getRoom(roomId)
    if (!room) {
      // 清理无效的游戏记录
      this.games.delete(roomId)
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
  async updateGameInstance(roomId: string, _game: BaseGame): Promise<void> {
    // 更新游戏实例的最后活动时间
    const gameData = this.games.get(roomId)
    if (gameData) {
      gameData.lastActivity = Date.now()
      this.games.set(roomId, gameData)
    }
  }

  /**
   * 删除游戏实例
   */
  async removeGameInstance(roomId: string): Promise<void> {
    this.games.delete(roomId)
    this.localCache.delete(roomId)
  }

  /**
   * 获取所有活跃游戏
   */
  async getAllActiveGames(): Promise<{ [roomId: string]: GameData }> {
    const result: { [roomId: string]: GameData } = {}
    for (const [roomId, gameData] of this.games.entries()) {
      result[roomId] = gameData
    }
    return result
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
  private recreateGameInstance(room: Room, io?: SocketIOServer): BaseGame | null {
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
  getCacheStats(): { gamesCount: number; localCacheSize: number } {
    return {
      gamesCount: this.games.size,
      localCacheSize: this.localCache.size,
    }
  }
}

export default new GameInstanceManager()
