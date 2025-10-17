/**
 * Room Manager - 内存版本
 * 复刻 server/core/RoomManager.ts 但使用内存存储
 * 匹配服务端 Room 类型定义
 */

import type { BaseRoom, GameState, NetworkPlayer } from '@/types/online'
import type { TaskSet } from '@/types/tasks'

interface CreateRoomParams {
  name: string
  hostId: string
  maxPlayers?: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
  [key: string]: any
}

class RoomManager {
  private rooms: Map<string, BaseRoom> = new Map()

  /**
   * 创建房间
   */
  async createRoom({
    name,
    hostId,
    maxPlayers = 4,
    gameType,
    taskSet = null,
    ...rest
  }: CreateRoomParams): Promise<BaseRoom> {
    // 生成6位房间ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

    const room: BaseRoom = {
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
      currentUser: undefined,
      boardPath: undefined,
      taskSet: taskSet || undefined,
      tasks: taskSet?.tasks || [],
      // 初始化游戏状态
      gameState: {
        playerPositions: {},
        turnCount: 0,
        gamePhase: 'waiting',
        startTime: Date.now(),
        boardSize: 0,
      } as GameState,
      ...rest,
    }

    this.rooms.set(roomId, room)
    console.log(`Room created: ${roomId}`, {
      name,
      gameType,
      taskSetId: taskSet?.id,
      tasksCount: taskSet?.tasks?.length || 0,
    })
    return room
  }

  /**
   * 删除房间
   */
  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId)
    console.log(`Room deleted: ${roomId}`)
  }

  /**
   * 更新房间
   */
  async updateRoom(room: BaseRoom): Promise<void> {
    room.lastActivity = Date.now()
    this.rooms.set(room.id, room)
  }

  /**
   * 获取房间
   */
  async getRoom(roomId: string): Promise<BaseRoom | null> {
    return this.rooms.get(roomId) || null
  }

  /**
   * 添加玩家到房间
   */
  async addPlayerToRoom(roomId: string, player: NetworkPlayer): Promise<BaseRoom | null> {
    const room = this.rooms.get(roomId)
    if (!room) return null

    if (room.players.length >= room.maxPlayers) {
      throw new Error('房间已满')
    }

    player.roomId = roomId
    player.position = 0
    player.score = 0

    // 初始化房间的gameState（如果不存在）
    if (!room.gameState) {
      room.gameState = {
        playerPositions: {},
        turnCount: 0,
        gamePhase: 'waiting',
        startTime: Date.now(),
        boardSize: room.boardPath?.length || 0,
      } as GameState
    }

    // 设置玩家初始位置
    room.gameState.playerPositions[player.id] = 0

    room.players.push(player)
    room.lastActivity = Date.now()

    this.rooms.set(roomId, room)
    console.log(`Player ${player.id} added to room ${roomId}`, {
      playersCount: room.players.length,
      maxPlayers: room.maxPlayers,
    })
    return room
  }

  /**
   * 从房间移除玩家
   */
  async removePlayerFromRoom(roomId: string, playerId: string): Promise<BaseRoom | null> {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.players = room.players.filter((p) => p.playerId !== playerId && p.id !== playerId)

    // 移除玩家位置信息
    if (room.gameState?.playerPositions) {
      delete room.gameState.playerPositions[playerId]
    }

    // 如果房主离开且房间还有人,转移房主
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0]?.playerId || room.players[0]?.id || ''
      room.players.forEach((p: NetworkPlayer) => (p.isHost = false))
      room.players[0]!.isHost = true
      console.log(`Host transferred to ${room.hostId}`)
    }

    // 如果房间空了,删除房间
    if (room.players.length === 0) {
      console.log('Room is empty, deleting')
      this.rooms.delete(roomId)
      return null
    }

    room.lastActivity = Date.now()
    this.rooms.set(roomId, room)
    console.log(`Player ${playerId} removed from room ${roomId}`, {
      playersLeft: room.players.length,
    })
    return room
  }

  /**
   * 获取所有房间
   */
  async getAllRooms(): Promise<{ [key: string]: BaseRoom }> {
    const result: { [key: string]: BaseRoom } = {}
    this.rooms.forEach((room, id) => {
      result[id] = room
    })
    return result
  }

  /**
   * 更新房间活跃时间
   */
  async touchRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId)
    if (room) {
      room.lastActivity = Date.now()
      this.rooms.set(roomId, room)
    }
  }

  /**
   * 清理超时房间
   */
  async cleanupInactiveRooms(timeoutMs: number = 30 * 60 * 1000): Promise<void> {
    const now = Date.now()
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > timeoutMs) {
        this.rooms.delete(roomId)
        console.log(`Cleaned up inactive room: ${roomId}`)
      }
    }
  }

  /**
   * 清理所有数据
   */
  async cleanup(): Promise<void> {
    this.rooms.clear()
    console.log('All rooms cleared')
  }
}

const roomManager = new RoomManager()
export default roomManager
