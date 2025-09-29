import BaseGame from '../../core/BaseGame.js'
import { createBoardPath } from '../../utils/index.js'
import type { SocketIOServer, Room, Player } from '../../typings/socket'
import type { TaskModalData } from '../../typings/room'

class FlyingGame extends BaseGame {
  constructor(room: Room, io: SocketIOServer) {
    super(room, io)

    // 初始化飞行棋特有状态
    const boardPath = createBoardPath()
    this.room.boardPath = boardPath

    if (this.room.gameState) {
      this.room.gameState.boardSize = boardPath.length
    }
  }

  async onStart() {
    this.gamePhase = 'playing'
    this.room.gameStatus = 'playing'

    // 初始化玩家位置
    this.room.players = this.room.players.map((player: Player) => ({
      ...player,
      position: 0,
    }))

    // 设置第一个玩家为当前用户
    this.room.currentUser = this.room.players[0]?.id || this.room.hostId

    const positions: { [playerId: string]: number } = {}
    this.room.players.forEach((player) => {
      positions[player.id] = 0
    })
    this.playerPositions = positions

    await this.updateRoomAndNotify()
  }

  async onPlayerAction(_io: SocketIOServer, playerId: string, action: any) {
    if (this.gamePhase !== 'playing') return

    switch (action.type) {
      case 'roll_dice':
        await this._handleDiceRoll(playerId)
        break
      case 'complete_task':
        await this._handleTaskComplete(playerId, action)
        break
    }
  }

  async _handleDiceRoll(playerId: string) {
    // 通过 room.currentUser 获取当前玩家
    const currentPlayer = this.room.players.find((p) => p.id === this.room.currentUser)
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return
    }

    const diceValue = Math.floor(Math.random() * 6) + 1

    // 保存骰子结果到游戏状态
    if (this.room.gameState) {
      this.room.gameState.lastDiceRoll = {
        playerId,
        playerName: currentPlayer.name,
        diceValue,
        timestamp: Date.now(),
      }
    }

    await this.updateRoomAndNotify()

    // 延迟移动棋子
    setTimeout(async () => {
      await this._movePlayer(playerId, diceValue)
    }, 1000)
  }

  async _movePlayer(playerId: string, steps: number) {
    const currentPos = this.playerPositions[playerId] || 0
    const finishLine = (this.room.gameState?.boardSize || 0) - 1
    let newPos

    // 计算新位置
    if (currentPos + steps > finishLine) {
      const excess = currentPos + steps - finishLine
      newPos = finishLine - excess
    } else {
      newPos = currentPos + steps
    }

    newPos = Math.max(0, newPos)

    // 更新玩家位置
    const positions = { ...this.playerPositions }
    positions[playerId] = newPos
    this.playerPositions = positions

    // 同步到 players 数组中
    const playerIndex = this.room.players.findIndex((p) => p.id === playerId)
    if (playerIndex !== -1) {
      this.room.players[playerIndex]!.position = newPos
    }

    // 检查碰撞和特殊格子
    const hasCollision = this._checkCollision(playerId, newPos)
    const cellType = this._getCellType(newPos)

    if (hasCollision) {
      await this._triggerTask(playerId, 'collision')
    } else if (cellType === 'trap') {
      await this._triggerTask(playerId, 'trap')
    } else if (cellType === 'star') {
      await this._triggerTask(playerId, 'star')
    } else {
      await this._nextPlayer()
    }

    await this._checkWinCondition()
  }

  _checkCollision(playerId: string, position: number): boolean {
    for (const [otherPlayerId, otherPosition] of Object.entries(this.playerPositions)) {
      if (otherPlayerId !== playerId && otherPosition === position) {
        return true
      }
    }
    return false
  }

  _getCellType(position: number): string {
    const cell = this.room.boardPath?.find((c) => c.position === position)
    return cell ? cell.type : 'path'
  }

  async _triggerTask(playerId: string, taskType: string = 'star') {
    const roomTasks = this.room.taskSet?.tasks || []
    const taskSet = this.room.taskSet
    let selectedTask = ''

    if (roomTasks.length > 0) {
      const randomIndex = Math.floor(Math.random() * roomTasks.length)
      selectedTask = roomTasks[randomIndex] as string
    }

    // 确定执行者
    let executorPlayers: Player[] = []
    if (taskType === 'star' || taskType === 'collision') {
      // 星星任务和碰撞任务由对手执行
      executorPlayers = this.room.players.filter((p: Player) => p.id !== playerId)
    } else {
      // 陷阱任务由触发者执行
      const triggerPlayer = this.room.players.find((p: Player) => p.id === playerId)
      if (triggerPlayer) {
        executorPlayers = [triggerPlayer]
      }
    }

    // 构造 TaskModalData
    const currentTask: TaskModalData = {
      id: taskSet?.id || '',
      title: selectedTask,
      description: taskSet?.description || '',
      type: taskType as 'trap' | 'star' | 'collision',
      executors: executorPlayers,
      category: taskSet?.categoryName || 'default',
      difficulty: taskSet?.difficulty || 'medium',
      triggerPlayerIds: [parseInt(playerId)], // 转换为数字数组
    }

    // 保存任务到游戏状态
    if (this.room.gameState) {
      this.room.gameState.currentTask = currentTask
    }

    await this.updateRoomAndNotify()
  }

  async _checkWinCondition() {
    for (const [playerId, position] of Object.entries(this.playerPositions)) {
      if (position >= (this.room.gameState?.boardSize || 0) - 1) {
        await this._endGame(playerId)
        return
      }
    }
  }

  async _nextPlayer() {
    // 找到当前玩家的索引
    const currentIndex = this.room.players.findIndex((p) => p.id === this.room.currentUser)
    const nextIndex = (currentIndex + 1) % this.room.players.length

    // 更新当前玩家
    this.room.currentUser = this.room.players[nextIndex]?.id || ''

    this.incrementTurn()
    await this.updateRoomAndNotify()
  }

  async _endGame(winnerId: string) {
    this.gamePhase = 'ended'
    this.room.gameStatus = 'ended'

    const winner = this.room.players.find((p: Player) => p.id === winnerId)

    // 保存胜利信息到游戏状态
    if (this.room.gameState) {
      this.room.gameState.winner = {
        winnerId,
        winnerName: winner?.name || '未知玩家',
        endTime: Date.now(),
        finalPositions: Object.entries(this.playerPositions),
      }
    }

    await this.updateRoomAndNotify()
    this.onEnd(this.socket)
  }

  async _handleTaskComplete(_playerId: string, _action: any) {
    // 获取当前任务并从任务列表中删除
    if (this.room.gameState && this.room.gameState.currentTask) {
      const completedTask = this.room.gameState.currentTask.description

      // 从任务集中删除已完成的任务
      if (this.room.taskSet?.tasks && completedTask) {
        this.room.taskSet.tasks = this.room.taskSet.tasks.filter((task) => task !== completedTask)
      }

      // 清除当前任务
      delete this.room.gameState.currentTask
    }

    await this._nextPlayer()
  }

  async onEnd(_io?: SocketIOServer) {
    this.gamePhase = 'ended'
    this.room.gameStatus = 'ended'
    await this.updateRoomAndNotify()
  }
}

export default FlyingGame
