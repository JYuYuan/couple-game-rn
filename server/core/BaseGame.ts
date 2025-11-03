import type { Player, Room, SocketIOServer } from '../typings/socket'
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
        boardSize: 0,
      }
    }

    // 确保游戏状态与玩家数据同步
    this.syncGameState()
  }

  abstract onStart(io?: SocketIOServer): void

  abstract onResume(io?: SocketIOServer): void

  abstract onPlayerAction(
    io: SocketIOServer,
    playerId: string,
    action: unknown,
    callback?: Function,
  ): void

  abstract onEnd(io?: SocketIOServer): void

  abstract _handleTaskComplete(playerId: string, action: unknown): void

  /**
   * 同步游戏状态 - 确保 gameState 和 players 数组保持一致
   */
  protected syncGameState(): void {
    if (!this.room.gameState) return

    // 从 players 数组同步位置到 gameState
    const positions: { [playerId: string]: number } = {}
    this.room.players.forEach((player: Player) => {
      positions[player.id] = player.position || 0
    })
    this.room.gameState.playerPositions = positions

    console.log('🔄 游戏状态同步完成:', {
      playersCount: this.room.players.length,
      positions: this.room.gameState.playerPositions,
    })
  }

  /**
   * 更新玩家位置 - 统一的位置更新方法
   */
  protected updatePlayerPosition(playerId: string, position: number): void {
    // 更新 players 数组
    const playerIndex = this.room.players.findIndex((p) => p.id === playerId)
    if (playerIndex !== -1) {
      this.room.players[playerIndex]!.position = position
    }

    // 更新 gameState
    if (this.room.gameState) {
      this.room.gameState.playerPositions[playerId] = position
    }

    console.log(`📍 玩家位置更新: ${playerId} -> ${position}`)
  }

  /**
   * 更新房间并通知所有玩家
   */
  protected async updateRoomAndNotify(): Promise<void> {
    // 确保状态同步
    this.syncGameState()

    this.room.lastActivity = Date.now()
    await roomManager.updateRoom(this.room)
    this.socket.to(this.room.id).emit('room:update', this.room)
  }

  /**
   * 获取玩家位置 - 从 players 数组获取（单一数据源）
   */
  get playerPositions(): { [playerId: string]: number } {
    const positions: { [playerId: string]: number } = {}
    this.room.players.forEach((player: Player) => {
      positions[player.id] = player.position || 0
    })
    return positions
  }

  /**
   * 设置玩家位置 - 统一更新两个数据源
   */
  set playerPositions(positions: { [playerId: string]: number }) {
    Object.entries(positions).forEach(([playerId, position]) => {
      this.updatePlayerPosition(playerId, position)
    })
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
  serialize(): unknown {
    return this.room.gameState
  }

  /**
   * 反序列化游戏状态（现在直接设置到 room.gameState）
   */
  deserialize(data: unknown): void {
    if (this.room.gameState && data && typeof data === 'object') {
      Object.assign(this.room.gameState, data)
    }
  }
}

export default BaseGame
