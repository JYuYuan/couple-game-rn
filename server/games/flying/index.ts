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

    // 初始化所有玩家位置为0
    this.room.players.forEach((player: Player) => {
      player.position = 0
    })

    // 设置第一个玩家为当前玩家
    this.room.currentUser = this.room.players[0]?.id || this.room.hostId

    // 同步游戏状态
    this.syncGameState()

    console.log('✅ 游戏开始，初始状态:', {
      gameStatus: this.room.gameStatus,
      currentUser: this.room.currentUser,
      playersCount: this.room.players.length,
      playerPositions: this.playerPositions,
    })

    await this.updateRoomAndNotify()
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

    // 同步游戏状态（BaseGame会自动处理位置同步）
    this.syncGameState()

    console.log('✅ 游戏继续，当前状态:', {
      gameStatus: this.room.gameStatus,
      currentUser: this.room.currentUser,
      playersCount: this.room.players.length,
      boardPathLength: this.room.boardPath?.length,
      playerPositions: this.playerPositions,
    })

    // 发送当前游戏状态给所有玩家
    await this.updateRoomAndNotify()
  }

  async onPlayerAction(_io: SocketIOServer, playerId: string, action: any) {
    if (this.room.gameStatus !== 'playing') return

    switch (action.type) {
      case 'roll_dice':
        await this._handleDiceRoll(playerId)
        break
      case 'move_complete':
        await this._handleMoveComplete(playerId)
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

    // 发送骰子结果到客户端，让客户端处理移动动画
    this.socket.to(this.room.id).emit('game:dice', {
      playerId,
      playerName: currentPlayer.name,
      diceValue,
      timestamp: Date.now(),
    })

    console.log(`✅ 骰子结果已发送，等待客户端移动完成通知`)
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
      console.log(`📍 格子详情:`, { position: cell.id, type: cell.type, x: cell.x, y: cell.y })
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

  async _handleMoveComplete(playerId: string) {
    console.log(`🎬 处理移动完成事件: 玩家=${playerId}`)
    
    // 获取最后一次骰子结果
    const lastDiceRoll = this.room.gameState?.lastDiceRoll
    console.log(lastDiceRoll)
    if (!lastDiceRoll || lastDiceRoll.playerId !== playerId) {
      console.log(`❌ 无效的移动完成事件: 没有对应的骰子记录`)
      return
    }

    // 验证并更新玩家位置
    const currentPos = this.playerPositions[playerId] || 0
    const steps = lastDiceRoll.diceValue
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

    // 使用统一的位置更新方法
    this.updatePlayerPosition(playerId, newPos)

    console.log(`📍 玩家移动: ${playerId} 从 ${currentPos} 移动到 ${newPos} (步数: ${steps})`)

    // 更新房间状态
    await this.updateRoomAndNotify()

    // 检查碰撞和特殊格子
    const hasCollision = this._checkCollision(playerId, newPos)
    const cellType = this._getCellType(newPos)

    console.log(`🎯 位置检查: 玩家${playerId} 到达位置${newPos}, 格子类型: ${cellType}, 是否碰撞: ${hasCollision}`)

    // 检查胜利条件
    await this._checkWinCondition()

    // 根据检查结果决定下一步
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
      console.log(`✅ 无事件触发，切换到下一个玩家`)
      await this._nextPlayer()
    }
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

  async _handleTaskComplete(playerId: string, action: any) {
    console.log(`📋 处理任务完成: 玩家=${playerId}, 结果=${action.completed}`)
    
    // 获取当前任务信息
    const currentTask = this.room.gameState?.currentTask
    if (!currentTask) {
      console.log(`❌ 没有找到当前任务`)
      return
    }

    const taskType = currentTask.type
    const completed = action.completed
    
    console.log(`🎯 任务类型: ${taskType}, 完成状态: ${completed}`)

    // 根据任务类型和完成状态决定位置变化
    let positionChange = 0
    
    if (taskType === 'star' && completed) {
      positionChange = 3 // 星星任务成功前进3格
      console.log(`⭐ 星星任务成功，前进3格`)
    } else if (taskType === 'trap' && !completed) {
      positionChange = -2 // 陷阱任务失败后退2格
      console.log(`🕳️ 陷阱任务失败，后退2格`)
    } else if (taskType === 'collision') {
      // 碰撞任务不改变位置，只是完成任务
      console.log(`💥 碰撞任务完成，位置不变`)
    }

    // 应用位置变化
    if (positionChange !== 0) {
      const currentPos = this.playerPositions[playerId] || 0
      const finishLine = (this.room.gameState?.boardSize || 0) - 1
      let newPos = currentPos + positionChange

      // 确保位置在有效范围内
      if (newPos > finishLine) {
        const excess = newPos - finishLine
        newPos = finishLine - excess
      }
      newPos = Math.max(0, newPos)

      // 使用统一的位置更新方法
      this.updatePlayerPosition(playerId, newPos)

      console.log(`📍 任务后位置更新: ${playerId} 从 ${currentPos} 移动到 ${newPos} (变化: ${positionChange})`)

      // 发送位置更新事件到客户端
      this.socket.to(this.room.id).emit('game:position_update', {
        playerId,
        fromPosition: currentPos,
        toPosition: newPos,
        reason: `${taskType}_${completed ? 'success' : 'fail'}`,
      })
    }

    // 从任务集中删除已完成的任务
     if (this.room.tasks && currentTask?.description) {
       this.room.tasks = this.room.tasks.filter((task: string) => task !== currentTask.description)
     }

    // 清除当前任务
    delete this.room.gameState?.currentTask

    // 更新房间状态
    await this.updateRoomAndNotify()

    // 检查胜利条件
    await this._checkWinCondition()

    // 任务完成后切换到下一个玩家
    console.log(`✅ 任务处理完成，切换到下一个玩家`)
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
