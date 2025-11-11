import { getRandomColor } from '../utils/index.js'
import type { Player } from '../typings/socket'

interface AddPlayerParams {
  playerId: string
  roomId?: string | null
  name: string
  isHost?: boolean
  [key: string]: unknown
}

/**
 * 🐾 内存版本的玩家管理器
 * 使用 Map 替代 Redis，性能更高，部署更简单
 */
class PlayerManager {
  private players = new Map<string, Player>()

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
    this.players.set(player.id, player)
    return player
  }

  async updatePlayer(player: Player): Promise<Player> {
    if (!player.id) throw new Error('player.id 缺失')
    player.lastSeen = Date.now()
    this.players.set(player.id, player)
    return player
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    return this.players.get(playerId) || null
  }

  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values())
  }

  async removePlayer(playerId: string): Promise<void> {
    this.players.delete(playerId)
  }

  async clearAll(): Promise<void> {
    this.players.clear()
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

  /**
   * 获取当前玩家数（用于监控）
   */
  getPlayerCount(): number {
    return this.players.size
  }
}

export default new PlayerManager()
