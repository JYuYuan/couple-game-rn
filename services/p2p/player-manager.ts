/**
 * Player Manager - 内存版本
 * 复刻 server/core/PlayerManager.ts 但使用内存存储
 * 匹配服务端 Player 类型定义
 */

import type { NetworkPlayer } from '@/types/online'

interface PlayerData {
  playerId: string
  name: string
  roomId: string | null
  isHost: boolean
  socketId?: string
  isConnected?: boolean
  color?: string
  iconType?: number
  position?: number
  score?: number
  [key: string]: any
}

class PlayerManager {
  private players: Map<string, NetworkPlayer> = new Map()

  /**
   * 添加玩家
   */
  async addPlayer(playerId: string, playerData: PlayerData): Promise<NetworkPlayer> {
    const now = Date.now()

    const player: NetworkPlayer = {
      ...playerData,
      id: playerId,
      playerId: playerId, // 兼容字段
      socketId: playerData.socketId || playerId,
      isConnected: playerData.isConnected ?? true,
      position: playerData.position ?? 0,
      score: playerData.score ?? 0,
      color: playerData.color || this.getDefaultColor(),
      iconType: playerData.iconType ?? 0,
      completedTasks: [],
      achievements: [],
      joinedAt: now,
      lastSeen: now,
      lastActivity: now,
    }

    this.players.set(playerId, player)
    console.log(`Player added: ${playerId}`, player)
    return player
  }

  /**
   * 获取玩家
   */
  async getPlayer(playerId: string): Promise<NetworkPlayer | null> {
    return this.players.get(playerId) || null
  }

  /**
   * 更新玩家
   */
  async updatePlayer(player: NetworkPlayer): Promise<void> {
    player.lastSeen = Date.now()
    player.lastActivity = Date.now()
    this.players.set(player.id, player)
  }

  /**
   * 删除玩家
   */
  async deletePlayer(playerId: string): Promise<void> {
    this.players.delete(playerId)
    console.log(`Player deleted: ${playerId}`)
  }

  /**
   * 获取所有玩家
   */
  async getAllPlayers(): Promise<NetworkPlayer[]> {
    return Array.from(this.players.values())
  }

  /**
   * 清理不活跃玩家
   */
  async cleanupInactivePlayers(timeoutMs: number = 30 * 60 * 1000): Promise<void> {
    const now = Date.now()
    for (const [playerId, player] of this.players.entries()) {
      if (now - (player.lastActivity || player.lastSeen || 0) > timeoutMs) {
        this.players.delete(playerId)
        console.log(`Cleaned up inactive player: ${playerId}`)
      }
    }
  }

  /**
   * 获取默认颜色
   */
  private getDefaultColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  /**
   * 清理所有数据
   */
  async cleanup(): Promise<void> {
    this.players.clear()
    console.log('All players cleared')
  }
}

const playerManager = new PlayerManager()
// @ts-ignore
export default playerManager
