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
    console.log('🎮 [GameRegistry] createGame 调用, type:', type)

    const GameClass = this.games.get(type)
    if (!GameClass) {
      console.error(`❌ 游戏类型未注册: ${type}`)
      console.error('🐛 [GameRegistry] 已注册的游戏类型:', Array.from(this.games.keys()))
      return null
    }

    console.log('✅ [GameRegistry] 找到游戏类:', GameClass.name)
    console.log('🏗️ [GameRegistry] 创建游戏实例...')

    try {
      const gameInstance = new GameClass(room, io)
      console.log('✅ [GameRegistry] 游戏实例创建成功')
      console.log('🐛 [GameRegistry] 实例类型:', gameInstance?.constructor?.name)
      console.log('🐛 [GameRegistry] 实例有 onPlayerAction:', typeof gameInstance?.onPlayerAction === 'function')
      return gameInstance
    } catch (error) {
      console.error('❌ [GameRegistry] 创建游戏实例失败:', error)
      return null
    }
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
    console.log('🏗️ [GameInstanceManager] createGameInstance 调用')
    console.log('🐛 [GameInstanceManager] room.id:', room.id)
    console.log('🐛 [GameInstanceManager] room.gameType:', room.gameType)

    const game = gameRegistry.createGame(room.gameType, room, io)
    if (!game) {
      console.error(`❌ 不支持的游戏类型: ${room.gameType}`)
      throw new Error(`不支持的游戏类型: ${room.gameType}`)
    }

    console.log('✅ [GameInstanceManager] 游戏实例创建成功')
    console.log('🐛 [GameInstanceManager] 游戏类型:', game?.constructor?.name)
    console.log('🐛 [GameInstanceManager] 游戏有 onPlayerAction:', typeof game?.onPlayerAction === 'function')

    this.games.set(room.id, {
      roomId: room.id,
      gameType: room.gameType,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })

    this.localCache.set(room.id, game)
    console.log('💾 [GameInstanceManager] 游戏实例已缓存到 localCache')
    console.log(`🎮 游戏实例已创建: 房间=${room.id}, 类型=${room.gameType}`)

    return game
  }

  /**
   * 获取游戏实例
   */
  async getGameInstance(roomId: string, io?: any): Promise<any> {
    console.log('🔍 [GameInstanceManager] getGameInstance 调用, roomId:', roomId)

    // 先从本地缓存查找
    if (this.localCache.has(roomId)) {
      const cachedGame = this.localCache.get(roomId)
      console.log('✅ [GameInstanceManager] 从缓存获取游戏实例')
      console.log('🐛 [GameInstanceManager] 缓存的游戏类型:', cachedGame?.constructor?.name)
      console.log('🐛 [GameInstanceManager] 缓存的游戏有 onPlayerAction:', typeof cachedGame?.onPlayerAction === 'function')
      return cachedGame
    }

    console.log('⚠️ [GameInstanceManager] 缓存中没有游戏实例，尝试重建...')

    // 检查游戏是否存在
    const gameData = this.games.get(roomId)
    if (!gameData) {
      console.error('❌ [GameInstanceManager] 游戏数据不存在')
      return null
    }

    console.log('✅ [GameInstanceManager] 找到游戏数据:', gameData)

    // 从 roomManager 获取最新的 room 数据
    const room = await roomManager.getRoom(roomId)
    if (!room) {
      console.error('❌ [GameInstanceManager] 房间不存在，删除游戏数据')
      this.games.delete(roomId)
      return null
    }

    console.log('✅ [GameInstanceManager] 找到房间数据, gameType:', room.gameType)

    // 重建游戏实例
    console.log('🔄 [GameInstanceManager] 开始重建游戏实例...')
    const game = this.recreateGameInstance(room, io)

    if (game) {
      console.log('✅ [GameInstanceManager] 游戏实例重建成功')
      console.log('🐛 [GameInstanceManager] 重建的游戏类型:', game?.constructor?.name)
      console.log('🐛 [GameInstanceManager] 重建的游戏有 onPlayerAction:', typeof game?.onPlayerAction === 'function')
      this.localCache.set(roomId, game)
      console.log('💾 [GameInstanceManager] 游戏实例已缓存')
    } else {
      console.error('❌ [GameInstanceManager] 游戏实例重建失败')
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
    console.log('🔄 [GameInstanceManager] recreateGameInstance 调用')
    console.log('🐛 [GameInstanceManager] room.gameType:', room.gameType)
    console.log('🐛 [GameInstanceManager] io 是否存在:', !!io)

    if (!io) {
      console.warn('⚠️ 无法重建游戏实例: 缺少 io 参数')
      return null
    }

    console.log('🎮 [GameInstanceManager] 调用 gameRegistry.createGame...')
    const game = gameRegistry.createGame(room.gameType, room, io)

    if (game) {
      console.log(`✅ 游戏实例已重建: 房间=${room.id}, 类型=${room.gameType}`)
      console.log('🐛 [GameInstanceManager] 重建后游戏类型:', game?.constructor?.name)
      console.log('🐛 [GameInstanceManager] 重建后游戏有 onPlayerAction:', typeof game?.onPlayerAction === 'function')
    } else {
      console.error('❌ [GameInstanceManager] gameRegistry.createGame 返回 null')
    }

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
