/**
 * Game Instance Manager - 内存版本
 * 复刻 server/core/GameInstanceManager.ts 但使用内存存储
 */

import type { BaseRoom } from '@/types/online'
import roomManager from './room-manager'
import FlightChessGame from './games/flight-chess-game'

// 游戏注册表
class SimpleGameRegistry {
  private games: Map<string, any> = new Map()

  registerGame(type: string, gameClass: any): void {
    this.games.set(type, gameClass)
    console.log(`✅ 游戏类型已注册: ${type}`)
  }

  createGame(type: string, room: BaseRoom, io: any): any {
    const GameClass = this.games.get(type)
    if (!GameClass) {
      console.error(`❌ 游戏类型未注册: ${type}`)
      return null
    }
    return new GameClass(room, io)
  }
}

const gameRegistry = new SimpleGameRegistry()

// 注册所有游戏类型
gameRegistry.registerGame('fly', FlightChessGame)

interface GameData {
  roomId: string
  gameType: string
  createdAt: number
  lastActivity: number
}

class GameInstanceManager {
  private games: Map<string, GameData> = new Map()
  private localCache: Map<string, any> = new Map()
  private readonly GAME_TTL = 2 * 60 * 60 * 1000 // 2小时

  /**
   * 创建游戏实例
   */
  async createGameInstance(room: BaseRoom, io: any): Promise<any> {
    const game = gameRegistry.createGame(room.gameType, room, io)
    if (!game) {
      throw new Error(`不支持的游戏类型: ${room.gameType}`)
    }

    this.games.set(room.id, {
      roomId: room.id,
      gameType: room.gameType,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })

    this.localCache.set(room.id, game)
    console.log(`🎮 游戏实例已创建: 房间=${room.id}, 类型=${room.gameType}`)

    return game
  }

  /**
   * 获取游戏实例
   */
  async getGameInstance(roomId: string, io?: any): Promise<any> {
    // 先从本地缓存查找
    if (this.localCache.has(roomId)) {
      return this.localCache.get(roomId)
    }

    // 检查游戏是否存在
    const gameData = this.games.get(roomId)
    if (!gameData) {
      return null
    }

    // 从 roomManager 获取最新的 room 数据
    const room = await roomManager.getRoom(roomId)
    if (!room) {
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
  async updateGameInstance(roomId: string, _game: any): Promise<void> {
    // 更新游戏实例的最后活动时间
    if (this.games.has(roomId)) {
      this.games.get(roomId)!.lastActivity = Date.now()
    }
  }

  /**
   * 删除游戏实例
   */
  async removeGameInstance(roomId: string): Promise<void> {
    this.games.delete(roomId)
    this.localCache.delete(roomId)
    console.log(`Game instance removed for room: ${roomId}`)
  }

  /**
   * 获取所有活跃游戏
   */
  async getAllActiveGames(): Promise<{ [roomId: string]: GameData }> {
    const result: { [roomId: string]: GameData } = {}
    this.games.forEach((game, roomId) => {
      result[roomId] = game
    })
    return result
  }

  /**
   * 清理过期游戏
   */
  async cleanupExpiredGames(): Promise<void> {
    const now = Date.now()
    for (const [roomId, gameData] of this.games.entries()) {
      if (now - gameData.lastActivity > this.GAME_TTL) {
        await this.removeGameInstance(roomId)
        console.log(`Cleaned up expired game: ${roomId}`)
      }
    }
  }

  /**
   * 从 room 数据重建游戏实例
   */
  private recreateGameInstance(room: BaseRoom, io?: any): any {
    if (!io) {
      console.warn('⚠️ 无法重建游戏实例: 缺少 io 参数')
      return null
    }

    const game = gameRegistry.createGame(room.gameType, room, io)
    console.log(`🔄 游戏实例已重建: 房间=${room.id}, 类型=${room.gameType}`)
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
  getCacheStats(): { localCacheSize: number; gamesCount: number } {
    return {
      localCacheSize: this.localCache.size,
      gamesCount: this.games.size,
    }
  }

  /**
   * 注册游戏类型
   */
  registerGame(type: string, gameClass: any): void {
    gameRegistry.registerGame(type, gameClass)
  }

  /**
   * 清理所有数据
   */
  async cleanup(): Promise<void> {
    this.games.clear()
    this.localCache.clear()
    console.log('All games cleared')
  }
}

const gameInstanceManager = new GameInstanceManager()
export default gameInstanceManager
