import BaseGame from '../../core/BaseGame.js'
import { createBoardPath } from '../../utils/index.js'
import type { Player, SocketIOServer, Room } from '../../typings/socket'
import type { TaskModalData } from '../../typings/room'

class FlyingGame extends BaseGame {
  constructor(room: Room, io: SocketIOServer) {
    super(room, io)
    console.log('🎮 飞行棋游戏实例创建')
  }

  async onStart() {
    console.log('🚀 开始飞行棋游戏')
    this.gamePhase = 'playing'
    this.room.gameStatus = 'playing'
    this.room.tasks = this.room.taskSet?.tasks || []

    // 调试任务集信息
    console.log('📋 任务集检查:', {
      taskSetExists: !!this.room.taskSet,
      taskSetId: this.room.taskSet?.id,
      taskSetName: this.room.taskSet?.name,
      tasksCount: this.room.tasks.length,
      tasks: this.room.tasks,
    })

    // 初始化飞行棋棋盘路径
    if (!this.room.boardPath) {
      console.log('📋 初始化飞行棋棋盘路径')
      const boardPath = createBoardPath()
      this.room.boardPath = boardPath

      // 调试棋盘特殊格子
      const specialCells = boardPath.filter(cell => cell.type !== 'path' && cell.type !== 'start' && cell.type !== 'end')
      console.log(`🎯 棋盘特殊格子数量: 星星=${specialCells.filter(c => c.type === 'star').length}, 陷阱=${specialCells.filter(c => c.type === 'trap').length}`)

      if (this.room.gameState) {
        this.room.gameState.boardSize = boardPath.length
      }
    }

    this.room.players = this.room.players.map((player: Player) => ({
      ...player,
      position: 0,
    }))
    this.room.currentUser = this.room.players[0]?.id || this.room.hostId
    const positions: { [playerId: string]: number } = {}
    this.room.players.forEach((player) => {
      positions[player.id] = 0
    })
    this.playerPositions = positions

    await this.updateRoomAndNotify()
    this.socket.to(this.room.id).emit('room:update', this.room)
  }

  async onResume() {
    console.log('🔄 继续飞行棋游戏')

    // 确保棋盘路径存在
    if (!this.room.boardPath) {
      console.log('📋 重新创建棋盘路径')
      this.room.boardPath = createBoardPath()
      if (this.room.gameState) {
        this.room.gameState.boardSize = this.room.boardPath.length
      }
    }

    // 发送当前游戏状态给所有玩家
    await this.updateRoomAndNotify()
    this.socket.to(this.room.id).emit('room:update', this.room)

    console.log('✅ 游戏继续，当前状态:', {
      gameStatus: this.room.gameStatus,
      currentUser: this.room.currentUser,
      playersCount: this.room.players.length,
      boardPathLength: this.room.boardPath?.length,
      playerPositions: this.playerPositions,
    })
  }

  async onPlayerAction(_io: SocketIOServer, playerId: string, action: any) {
    if (this.room.gameStatus !== 'playing') return

    switch (action.type) {
      case 'roll_dice':
        await this._handleDiceRoll(playerId)
        break
      case 'move_complete':
        await this._nextPlayer()
        break
      case 'complete_task':
        await this._handleTaskComplete(playerId, action)
        break
    }
  }

  async _handleDiceRoll(playerId: string) {
    // 通过 room.currentUser 获取当前玩家
    const currentPlayer = this.room.players.find((p) => p.id === this.room.currentUser)
    console.log(`🎲 投骰子请求: playerId=${playerId}, currentUser=${this.room.currentUser}, currentPlayer=${currentPlayer?.name}`)

    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.log(`❌ 投骰子被拒绝: 不是当前玩家的回合`)
      return
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    console.log(`🎲 骰子结果: ${diceValue}, 玩家: ${currentPlayer.name} (${playerId})`)

    // 保存骰子结果到游戏状态
    if (this.room.gameState) {
      this.room.gameState.lastDiceRoll = {
        playerId,
        playerName: currentPlayer.name,
        diceValue,
        timestamp: Date.now(),
      }
    }

    // 发送独立的骰子事件
    this.socket.to(this.room.id).emit('game:dice', {
      playerId,
      playerName: currentPlayer.name,
      diceValue,
      timestamp: Date.now(),
    })

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

    // 发送独立的移动事件
    this.socket.to(this.room.id).emit('game:move', {
      playerId,
      fromPosition: currentPos,
      toPosition: newPos,
      steps,
    })

    // 更新房间状态（不包含gameState中的移动数据）
    await this.updateRoomAndNotify()

    // 检查碰撞和特殊格子
    const hasCollision = this._checkCollision(playerId, newPos)
    const cellType = this._getCellType(newPos)

    console.log(`🎯 位置检查: 玩家${playerId} 到达位置${newPos}, 格子类型: ${cellType}, 是否碰撞: ${hasCollision}`)
    console.log(`📋 任务数据检查: taskSet存在=${!!this.room.taskSet}, 任务数量=${this.room.taskSet?.tasks?.length || 0}`)

    if (hasCollision) {
      console.log(`💥 触发碰撞任务`)
      await this._triggerTask(playerId, 'collision')
    } else if (cellType === 'trap') {
      console.log(`🕳️ 触发陷阱任务`)
      await this._triggerTask(playerId, 'trap')
    } else if (cellType === 'star') {
      console.log(`⭐ 触发星星任务`)
      await this._triggerTask(playerId, 'star')
    } else {
      console.log(`🛤️ 普通路径，无任务触发`)
    }
    // 注意：不在这里切换玩家，等待客户端动画完成后的 move_complete 事件

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
    const cell = this.room.boardPath?.find((c) => c.id === position)
    const cellType = cell ? cell.type : 'path'
    console.log(`🔍 格子类型检查: 位置${position}, 找到格子=${!!cell}, 类型=${cellType}`)
    if (cell) {
      console.log(`📍 格子详情:`, { position: cell.position, type: cell.type, x: cell.x, y: cell.y })
    }
    return cellType
  }

  async _triggerTask(playerId: string, taskType: string = 'star') {
    const roomTasks = this.room.taskSet?.tasks || []
    const taskSet = this.room.taskSet
    let selectedTask = ''

    console.log(`🎯 开始触发任务: 玩家=${playerId}, 类型=${taskType}`)

    if (roomTasks.length > 0) {
      const randomIndex = Math.floor(Math.random() * roomTasks.length)
      selectedTask = roomTasks[randomIndex] as string
      console.log(`🎲 随机选择任务: ${selectedTask} (索引: ${randomIndex})`)
    } else {
      console.log(`❌ 没有可用的任务，跳过任务触发`)
      return // 如果没有任务，直接返回
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

    // 发送独立的任务事件
    console.log(`📤 发送任务事件到房间 ${this.room.id}:`, {
      task: selectedTask,
      taskType,
      executorPlayerIds: executorPlayers.map((p) => p.id),
      triggerPlayerIds: [playerId],
    })

    this.socket.to(this.room.id).emit('game:task', {
      task: {
        id: taskSet?.id || '',
        title: selectedTask,
        description: taskSet?.description || '',
        category: taskSet?.categoryName || 'default',
        difficulty: taskSet?.difficulty || 'medium',
      },
      taskType,
      executorPlayerIds: executorPlayers.map((p) => p.id),
      triggerPlayerIds: [playerId],
    })

    // 只更新房间基础状态，不发送gameState
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
    this.socket
      .to(this.room.id)
      .emit('game:next', { currentUser: this.room.currentUser, roomId: this.room.id })
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

    // 发送独立的胜利事件
    this.socket.to(this.room.id).emit('game:victory', {
      winnerId,
      winnerName: winner?.name || '未知玩家',
      endTime: Date.now(),
      finalPositions: Object.entries(this.playerPositions),
    })

    // 更新房间状态
    await this.updateRoomAndNotify()
    await this.onEnd(this.socket)
  }

  async _handleTaskComplete(_playerId: string, _action: any) {
    // 获取当前任务并从任务列表中删除
    if (this.room.gameState && this.room.gameState.currentTask) {
      const completedTask = this.room.gameState.currentTask.description

      // 从任务集中删除已完成的任务
      if (this.room.tasks && completedTask) {
        this.room.tasks = this.room.tasks.filter((task: string) => task !== completedTask)
      }

      // 清除当前任务
      delete this.room.gameState.currentTask
    }

    // 任务完成后切换到下一个玩家
    await this._nextPlayer()
  }

  async onEnd(_io?: SocketIOServer) {
    this.gamePhase = 'ended'
    this.room.gameStatus = 'ended'
    await this.updateRoomAndNotify()
    this.socket.to(this.room.id).emit('room:update', this.room)
  }
}

export default FlyingGame
