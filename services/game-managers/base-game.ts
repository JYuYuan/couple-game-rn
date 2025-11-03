/**
 * Base Game - P2P 版本
 * 复刻 server/core/BaseGame.ts
 */

import type { BaseRoom } from '@/types/online'
import roomManager from './room-manager'

// 模拟的 Socket.IO Server 接口
export interface MockSocketIO {
  to(room: string): {
    emit(event: string, data: unknown): void
  }
  emit(event: string, data: unknown): void
}

export default abstract class BaseGame {
  protected room: BaseRoom
  protected socket: MockSocketIO
  protected gamePhase: string = 'waiting'
  protected playerPositions: { [playerId: string]: number } = {}

  constructor(room: BaseRoom, io: MockSocketIO) {
    this.room = room
    this.socket = io
    console.log(`🎮 Base Game 初始化: ${room.id}, 类型: ${room.gameType}`)
  }

  /**
   * 游戏开始
   */
  abstract onStart(): Promise<void>

  /**
   * 游戏继续(断线重连后)
   */
  abstract onResume(): Promise<void>

  /**
   * 玩家动作
   */
  abstract onPlayerAction(
    io: MockSocketIO,
    playerId: string,
    action: unknown,
    callback?: Function,
  ): Promise<void>

  /**
   * 游戏结束
   */
  abstract onEnd(io?: MockSocketIO): Promise<void>

  /**
   * 同步游戏状态
   */
  protected syncGameState(): void {
    if (!this.room.gameState) {
      this.room.gameState = {
        playerPositions: {},
        turnCount: 0,
        gamePhase: this.gamePhase,
        startTime: Date.now(),
        boardSize: this.room.boardPath?.length || 0,
      }
    }

    // 同步玩家位置到 gameState
    for (const player of this.room.players) {
      const position = this.playerPositions[player.id] ?? player.position ?? 0
      this.room.gameState.playerPositions[player.id] = position
      player.position = position
    }

    // 同步游戏阶段
    this.room.gameState.gamePhase = this.gamePhase

    console.log(`🔄 游戏状态已同步:`, {
      gamePhase: this.gamePhase,
      playerPositions: this.room.gameState.playerPositions,
    })
  }

  /**
   * 更新玩家位置
   */
  protected updatePlayerPosition(playerId: string, newPosition: number): void {
    this.playerPositions[playerId] = newPosition

    // 同步到 room.players
    const player = this.room.players.find((p) => p.id === playerId)
    if (player) {
      player.position = newPosition
    }

    // 同步到 room.gameState
    if (this.room.gameState) {
      this.room.gameState.playerPositions[playerId] = newPosition
    }

    console.log(`📍 玩家位置更新: ${playerId} -> ${newPosition}`)
  }

  /**
   * 增加回合数
   */
  protected incrementTurn(): void {
    if (this.room.gameState) {
      this.room.gameState.turnCount++
      console.log(`🔄 回合数: ${this.room.gameState.turnCount}`)
    }
  }

  /**
   * 更新房间并通知所有玩家
   */
  protected async updateRoomAndNotify(): Promise<void> {
    console.log(`🔄 [BaseGame] updateRoomAndNotify 开始, roomId: ${this.room.id}`)

    // 同步游戏状态
    this.syncGameState()

    // 更新房间到存储
    console.log(`💾 [BaseGame] 更新房间到存储...`)
    await roomManager.updateRoom(this.room)
    console.log(`✅ [BaseGame] 房间已更新到存储`)

    // 通知所有玩家
    console.log(`📡 [BaseGame] 准备发送 room:update 事件...`)
    console.log(`🐛 [BaseGame] 房间状态:`, {
      id: this.room.id,
      gameStatus: this.room.gameStatus,
      playersCount: this.room.players.length,
    })
    this.socket.to(this.room.id).emit('room:update', this.room)
    console.log(`✅ [BaseGame] room:update 事件已发送`)

    console.log(`✅ 房间状态已更新并通知: ${this.room.id}`)
  }
}
