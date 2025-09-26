import BaseGame from '../../core/BaseGame.js'
import { createBoardPath } from '../../utils/index.js'
import roomManager from '../../core/RoomManager.js'
import type { SocketIOServer, Room, Player } from '../../typings/socket'

class FlyingGame extends BaseGame {
  constructor(room: Room, io: SocketIOServer) {
    super(room, io)
    this.boardPath = createBoardPath() // 创建棋盘路径
    this.boardSize = this.boardPath.length
  }

  onStart() {
    super.onStart()
    this.room.gameStatus = 'playing'
    this.room.lastActivity = Date.now()

    // 初始化玩家位置
    this.room.players = this.room.players.map((player: Player) => ({ ...player, position: 0 }))
    this.room.currentUser = this.room.hostId
    this.room.boardPath = this.boardPath
    roomManager.updateRoom(this.room)
    this.socket.to(this.room.id).emit('room:update', this.room)
    this._broadcastState()
    this._notifyCurrentPlayer()
  }

  onPlayerAction(_io: SocketIOServer, playerId: string, action: any) {
    if (this.gameState !== 'playing') return

    switch (action.type) {
      case 'roll_dice':
        this._handleDiceRoll(playerId)
        break
      case 'complete_task':
        this._handleTaskComplete(playerId, action)
        break
    }
  }

  _handleDiceRoll(playerId: string) {
    const currentPlayer = this.room.players[this.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return // 不是当前玩家
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    this.socket.to(this.room.id).emit('game:dice-roll', {
      playerId,
      playerName: currentPlayer!.name,
      diceValue,
    })

    // 自动移动棋子
    setTimeout(() => {
      this._movePlayer(playerId, diceValue)
    }, 1000)
  }

  _movePlayer(playerId: string, steps: number) {
    const currentPos = this.playerPositions[playerId] || 0
    const finishLine = this.boardSize - 1 // 终点位置
    let newPos

    // 计算新位置，考虑倒着走的机制
    if (currentPos + steps > finishLine) {
      // 如果超过终点，需要倒着走
      const excess = currentPos + steps - finishLine
      newPos = finishLine - excess
    } else {
      newPos = currentPos + steps
    }

    // 确保位置不小于0
    newPos = Math.max(0, newPos)

    this.playerPositions[playerId] = newPos

    this.socket.to(this.room.id).emit('game:player-move', {
      playerId,
      fromPos: currentPos,
      toPos: newPos,
      steps,
    })

    // 检查是否有碰撞或特殊格子
    const hasCollision = this._checkCollision(playerId, newPos)
    const cellType = this._getCellType(newPos)

    if (hasCollision) {
      this._triggerTask(playerId, 'collision')
    } else if (cellType === 'trap') {
      this._triggerTask(playerId, 'trap')
    } else if (cellType === 'star') {
      this._triggerTask(playerId, 'star')
    } else {
      this._nextPlayer()
    }

    this._broadcastState()
    this._checkWinCondition()
  }

  // 检查碰撞
  _checkCollision(playerId: string, position: number): boolean {
    for (const [otherPlayerId, otherPosition] of Object.entries(this.playerPositions)) {
      if (otherPlayerId !== playerId && otherPosition === position) {
        return true
      }
    }
    return false
  }

  // 获取格子类型
  _getCellType(position: number): string {
    const cell = this.boardPath.find((c) => c.position === position)
    return cell ? cell.type : 'path'
  }

  // 触发任务
  _triggerTask(playerId: string, taskType: string = 'star') {
    // 从房间的任务集合中随机选取任务
    const roomTasks = this.room.tasks || []
    let selectedTask = null

    if (roomTasks.length > 0) {
      // 从房间的任务中随机选取一个
      const randomIndex = Math.floor(Math.random() * roomTasks.length)
      selectedTask = roomTasks[randomIndex]
    } else {
      // 如果没有任务，使用默认任务
      selectedTask = {
        id: Date.now().toString(),
        title: '默认任务',
        description: '完成这个任务',
        category: 'default',
        difficulty: 'medium',
      }
    }

    const taskDescriptions: { [key: string]: string } = {
      trap: `陷阱任务：${selectedTask.title}`,
      star: `奖励任务：${selectedTask.title}`,
      collision: `碰撞任务：${selectedTask.title}`,
    }

    // 根据任务类型确定执行者
    let executorPlayerId = playerId
    if (taskType === 'star' || taskType === 'collision') {
      // 星星任务和碰撞任务由对手执行
      const opponents = this.room.players.filter((p: Player) => p.id !== playerId)
      if (opponents.length > 0) {
        executorPlayerId = opponents[0]!.id // 取第一个对手
      }
    }

    const task = {
      ...selectedTask, // 使用真实的任务数据
      id: selectedTask.id,
      type: taskType,
      title: selectedTask.title,
      description: taskDescriptions[taskType] + '\n\n' + (selectedTask.description || ''),
      triggerPlayerId: playerId,
      executorPlayerId: executorPlayerId,
    }

    this.socket.to(this.room.id).emit('game:task-trigger', {
      executorPlayerId: executorPlayerId,
      triggerPlayerId: playerId,
      task: task,
      taskType: taskType,
    })

    console.log(
      `任务触发: 类型=${taskType}, 触发者=${playerId}, 执行者=${executorPlayerId}, 任务=${selectedTask.title}`,
    )
  }

  _checkWinCondition() {
    for (const [playerId, position] of Object.entries(this.playerPositions)) {
      if (position >= this.boardSize - 1) {
        this._endGame(playerId)
        return
      }
    }
  }

  _nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.room.players.length
    this._notifyCurrentPlayer()
  }

  _notifyCurrentPlayer() {
    const currentPlayer = this.room.players[this.currentPlayerIndex]
    if (!currentPlayer) return

    this.socket.to(this.room.id).emit('game:turn-change', {
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: currentPlayer.id,
      currentPlayerName: currentPlayer.name,
    })
  }

  _endGame(winnerId: string) {
    this.gameState = 'ended'
    const winner = this.room.players.find((p: Player) => p.id === winnerId)

    this.socket.to(this.room.id).emit('game:victory', {
      winnerId,
      winnerName: winner?.name || '未知玩家',
      finalPositions: Object.entries(this.playerPositions),
    })

    this.onEnd(this.socket)
  }

  _broadcastState() {
    const gameState = {
      currentPlayerIndex: this.currentPlayerIndex,
      gameState: this.gameState,
      playerPositions: Object.entries(this.playerPositions),
      boardSize: this.boardSize,
    }

    this.socket.to(this.room.id).emit('game:state', gameState)
  }

  onEnd(io?: SocketIOServer) {
    this.room.gameStatus = 'ended'
    if (io) {
      io.to(this.room.id).emit('game:ended', { room: this.room })
    }
  }
}

export default FlyingGame
