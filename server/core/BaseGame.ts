import type { SocketIOServer } from '../typings/socket'
import type { Room } from '../typings/socket'
import roomManager from './RoomManager.js'

abstract class BaseGame {
  room: Room
  socket: SocketIOServer

  constructor(room: Room, io: SocketIOServer) {
    this.room = room
    this.socket = io

    // 初始化游戏状态
    if (!this.room.gameState) {
      this.room.gameState = {
        playerPositions: {},
        turnCount: 0,
        gamePhase: 'idle',
        startTime: Date.now(),
        boardSize: 0
      }
    }
  }

  abstract onStart(io?: SocketIOServer): void

  abstract onPlayerAction(io: SocketIOServer, playerId: string, action: any): void

  abstract onEnd(io?: SocketIOServer): void

  abstract _handleTaskComplete(playerId: string, action: any): void

  /**
   * 更新房间并通知所有玩家
   */
  protected async updateRoomAndNotify(): Promise<void> {
    this.room.lastActivity = Date.now()
    await roomManager.updateRoom(this.room)
    this.socket.to(this.room.id).emit('room:update', this.room)
  }

  /**
   * 获取玩家位置
   */
  get playerPositions(): { [playerId: string]: number } {
    return this.room.gameState?.playerPositions || {}
  }

  /**
   * 设置玩家位置
   */
  set playerPositions(positions: { [playerId: string]: number }) {
    if (this.room.gameState) {
      this.room.gameState.playerPositions = positions
    }
  }

  /**
   * 获取游戏阶段
   */
  get gamePhase(): string {
    return this.room.gameState?.gamePhase || 'idle'
  }

  /**
   * 设置游戏阶段
   */
  set gamePhase(phase: string) {
    if (this.room.gameState) {
      this.room.gameState.gamePhase = phase
    }
  }

  /**
   * 获取回合数
   */
  get turnCount(): number {
    return this.room.gameState?.turnCount || 0
  }

  /**
   * 增加回合数
   */
  incrementTurn(): void {
    if (this.room.gameState) {
      this.room.gameState.turnCount++
    }
  }

  /**
   * 获取游戏开始时间
   */
  get startTime(): number {
    return this.room.gameState?.startTime || Date.now()
  }

  /**
   * 获取游戏运行时间
   */
  getGameDuration(): number {
    return Date.now() - this.startTime
  }

  /**
   * 序列化游戏状态（现在直接返回 room.gameState）
   */
  serialize(): any {
    return this.room.gameState
  }

  /**
   * 反序列化游戏状态（现在直接设置到 room.gameState）
   */
  deserialize(data: any): void {
    if (this.room.gameState && data) {
      Object.assign(this.room.gameState, data)
    }
  }
}

export default BaseGame
