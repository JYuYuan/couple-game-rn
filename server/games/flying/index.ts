import BaseGame from '../../core/BaseGame.js'
import { createBoardPath } from '../../utils/index.js'
import type { Player, Room, SocketIOServer } from '../../typings/socket'
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
      const specialCells = boardPath.filter(
        (cell) => cell.type !== 'path' && cell.type !== 'start' && cell.type !== 'end',
      )
      console.log(
        `🎯 棋盘特殊格子数量: 星星=${specialCells.filter((c) => c.type === 'star').length}, 陷阱=${specialCells.filter((c) => c.type === 'trap').length}`,
      )

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

  async onPlayerAction(
    _io: SocketIOServer,
    playerId: string,
    action: unknown,
    callback?: Function,
  ) {
    if (this.room.gameStatus !== 'playing') {
      callback?.({ success: false, error: '游戏未在进行中' })
      return
    }

    // 类型安全的action访问
    const actionData = action as { type?: string }

    switch (actionData.type) {
      case 'roll_dice':
        await this._handleDiceRoll(playerId, callback)
        break
      case 'move_complete':
        await this._handleMoveComplete(playerId)
        callback?.({ success: true })
        break
      case 'complete_task':
        await this._handleTaskComplete(playerId, action)
        callback?.({ success: true })
        break
      default:
        callback?.({ success: false, error: '未知的动作类型' })
    }
  }

  async _handleDiceRoll(playerId: string, callback?: Function) {
    // 通过 room.currentUser 获取当前玩家
    const currentPlayer = this.room.players.find((p) => p.id === this.room.currentUser)
    console.log(
      `🎲 投骰子请求: playerId=${playerId}, currentUser=${this.room.currentUser}, currentPlayer=${currentPlayer?.name}`,
    )

    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.log(`❌ 投骰子被拒绝: 不是当前玩家的回合`)
      callback?.({ success: false, error: '不是当前玩家的回合' })
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
    // 通过回调返回结果给请求的客户端
    callback?.({
      playerId,
      diceValue,
      success: true,
      timestamp: Date.now(),
      playerName: currentPlayer.name,
    })

    this.socket.to(this.room.id).emit('game:dice', {
      playerId,
      diceValue,
      success: true,
      timestamp: Date.now(),
      playerName: currentPlayer.name,
    })
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
    const taskSet = this.room.taskSet
    console.log(`🎯 开始触发任务: 玩家=${playerId}, 类型=${taskType}`)

    if (!taskSet || !taskSet.tasks || taskSet.tasks.length === 0) {
      console.log(`❌ 没有可用的任务集，跳过任务触发`)
      await this._nextPlayer()
      return
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

    if (executorPlayers.length === 0) {
      console.log(`❌ 没有执行者，跳过任务触发`)
      await this._nextPlayer()
      return
    }

    // 🐾 为每个执行者分配不同的任务
    const executorTasks: {
      executor: Player
      task: { title: string; description?: string }
      completed: boolean
    }[] = []

    // 当前可用任务池（this.room.tasks）
    let availableTasks = [...(this.room.tasks || [])]
    const allTasksInSet = taskSet.tasks || []

    console.log(
      `📋 任务分配: 执行者数量=${executorPlayers.length}, 可用任务池=${availableTasks.length}, 任务集总数=${allTasksInSet.length}`,
    )

    for (const executor of executorPlayers) {
      let selectedTask: string

      if (availableTasks.length > 0) {
        // 从任务池中随机抽取一个任务
        const randomIndex = Math.floor(Math.random() * availableTasks.length)
        selectedTask = availableTasks[randomIndex] as string
        // 从任务池中移除已分配的任务
        availableTasks.splice(randomIndex, 1)
        console.log(`🎲 从任务池分配任务给 ${executor.name}: ${selectedTask}`)
      } else {
        // 任务池为空，从 taskSet 中随机抽取
        const randomIndex = Math.floor(Math.random() * allTasksInSet.length)
        selectedTask = allTasksInSet[randomIndex] as string
        console.log(`🔄 任务池为空，从任务集随机抽取给 ${executor.name}: ${selectedTask}`)
      }

      executorTasks.push({
        executor: executor,
        task: {
          title: selectedTask,
          ...(taskSet.description ? { description: taskSet.description } : {}),
        },
        completed: false,
      })
    }

    // 更新 room.tasks（移除已分配的任务）
    this.room.tasks = availableTasks

    // 构造 TaskModalData
    const currentTask: any = {
      id: taskSet.id,
      type: taskType as 'trap' | 'star' | 'collision',
      category: taskSet.categoryName || 'default',
      difficulty: taskSet.difficulty || 'medium',
      triggerPlayerIds: [playerId],
      executorTasks: executorTasks,
    }

    // 保存任务到游戏状态，并标记有待处理的任务
    if (this.room.gameState) {
      this.room.gameState.currentTask = currentTask
      this.room.gameState.hasPendingTask = true
    }

    // 发送独立的任务事件
    console.log(`📤 发送任务事件到房间 ${this.room.id}:`, {
      taskType,
      executorCount: executorTasks.length,
      executorPlayerIds: executorPlayers.map((p) => p.id),
      triggerPlayerIds: [playerId],
    })

    this.socket.to(this.room.id).emit('game:task', {
      task: currentTask,
      taskType,
      executorPlayerIds: executorPlayers.map((p) => p.id),
      triggerPlayerIds: [playerId],
    })

    // 只更新房间基础状态，不发送gameState
    await this.updateRoomAndNotify()

    console.log(`⏸️ 任务已触发，等待所有执行者完成任务...`)
  }

  async _handleMoveComplete(playerId: string) {
    console.log(`🎬 处理移动完成事件: 玩家=${playerId}`)

    // 获取最后一次骰子结果
    const lastDiceRoll = this.room.gameState?.lastDiceRoll
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

    // 检查胜利条件
    await this._checkWinCondition()

    // 检查碰撞和特殊格子
    const hasCollision = this._checkCollision(playerId, newPos)
    const cellType = this._getCellType(newPos)

    console.log(
      `🎯 位置检查: 玩家${playerId} 到达位置${newPos}, 格子类型: ${cellType}, 是否碰撞: ${hasCollision}`,
    )

    // 根据检查结果决定下一步
    // 如果触发特殊事件，等待玩家完成任务后再切换玩家
    // 如果没有触发特殊事件，直接切换到下一个玩家
    if (hasCollision) {
      console.log(`💥 触发碰撞任务，等待任务完成后切换玩家`)
      await this._triggerTask(playerId, 'collision')
      // 任务完成后会在 _handleTaskComplete 中切换玩家
    } else if (cellType === 'trap') {
      console.log(`🕳️ 触发陷阱任务，等待任务完成后切换玩家`)
      await this._triggerTask(playerId, 'trap')
      // 任务完成后会在 _handleTaskComplete 中切换玩家
    } else if (cellType === 'star') {
      console.log(`⭐ 触发星星任务，等待任务完成后切换玩家`)
      await this._triggerTask(playerId, 'star')
      // 任务完成后会在 _handleTaskComplete 中切换玩家
    } else {
      console.log(`✅ 无特殊事件触发，直接切换到下一个玩家`)
      await this._nextPlayer()
    }
  }

  async _checkWinCondition() {
    console.log(this.playerPositions)
    for (const [playerId, position] of Object.entries(this.playerPositions)) {
      console.log(playerId, position)
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

    // 🐾 从任务集中随机选择3个任务
    let victoryTasks: string[] = []
    if (this.room.taskSet && this.room.taskSet.tasks && this.room.taskSet.tasks.length > 0) {
      const allTasks = [...this.room.taskSet.tasks]
      // 随机打乱并取前3个
      const shuffled = allTasks.sort(() => Math.random() - 0.5)
      victoryTasks = shuffled.slice(0, Math.min(3, shuffled.length))
      console.log(`🎯 为胜利者选择了 ${victoryTasks.length} 个任务:`, victoryTasks)
    }

    // 保存胜利信息到游戏状态
    if (this.room.gameState) {
      this.room.gameState.winner = {
        winnerId,
        winnerName: winner?.name || '未知玩家',
        endTime: Date.now(),
        finalPositions: Object.entries(this.playerPositions),
      }
    }

    // 发送独立的胜利事件给所有玩家（包括获胜者）
    this.socket.to(this.room.id).emit('game:victory', {
      winner: {
        id: winnerId,
        name: winner?.name || '未知玩家',
        color: winner?.color || '#4CAF50',
        tasks: victoryTasks, // 🐾 随机选择的3个胜利任务
        ...winner,
      },
      endTime: Date.now(),
      finalPositions: Object.entries(this.playerPositions),
    })

    // 更新房间状态
    await this.updateRoomAndNotify()
    await this.onEnd(this.socket)
  }

  async _handleTaskComplete(playerId: string, action: unknown) {
    const actionData = action as { completed?: boolean }
    console.log(`📋 处理任务完成: 玩家=${playerId}, 结果=${actionData.completed}`)

    // 获取当前任务信息
    const currentTask = this.room.gameState?.currentTask
    if (!currentTask || !currentTask.executorTasks) {
      console.log(`❌ 没有找到当前任务`)
      return
    }

    // 🐾 找到当前玩家对应的 ExecutorTask
    const executorTask = currentTask.executorTasks.find(
      (et: { executor: Player }) => et.executor.id === playerId,
    )

    if (!executorTask) {
      console.log(`❌ 当前玩家不是执行者: ${playerId}`)
      return
    }

    if (executorTask.completed) {
      console.log(`⚠️ 该玩家已经完成过任务: ${playerId}`)
      return
    }

    const taskType = currentTask.type
    const completed = actionData.completed

    console.log(`🎯 任务类型: ${taskType}, 完成状态: ${completed}`)

    // 获取执行者信息用于通知
    const executor = this.room.players.find((p: Player) => p.id === playerId)
    const executorName = executor?.name || '玩家'

    // 根据任务类型和完成状态决定位置变化
    const step = Math.floor(Math.random() * 4) + 3
    let positionChange = completed ? step : -step

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

      if (taskType === 'collision' && !completed) newPos = 0

      // 使用统一的位置更新方法
      this.updatePlayerPosition(playerId, newPos)

      console.log(
        `📍 任务后位置更新: ${playerId} 从 ${currentPos} 移动到 ${newPos} (变化: ${positionChange})`,
      )
    }

    // 🐾 标记该 ExecutorTask 为已完成，并保存结果
    executorTask.completed = true
    executorTask.result = {
      completed: completed || false,
      content: taskType === 'collision' && !completed ? 0 : positionChange,
      timestamp: Date.now(),
    }

    console.log(`✅ 玩家 ${executorName} 完成任务，结果已保存`)

    // 🐾 广播该玩家的任务完成事件（部分完成）
    this.socket.to(this.room.id).emit('game:task_completed', {
      playerId,
      playerName: executorName,
      taskType,
      completed,
      taskTitle: executorTask.task.title,
      content: executorTask.result.content,
      allCompleted: false, // 标记不是所有人都完成
      currentTask: currentTask, // 发送更新后的任务数据
    })

    await this.updateRoomAndNotify()

    // 检查胜利条件
    await this._checkWinCondition()

    // 🐾 检查是否所有执行者都已完成
    const allCompleted = currentTask.executorTasks.every(
      (et: { completed: boolean }) => et.completed,
    )

    if (allCompleted) {
      console.log(`🎉 所有执行者都已完成任务，准备清除任务并切换玩家`)

      // 清除当前任务和待处理标志
      if (this.room.gameState) {
        delete this.room.gameState.currentTask
        this.room.gameState.hasPendingTask = false
      }

      // 🐾 广播所有任务完成事件
      this.socket.to(this.room.id).emit('game:all_tasks_completed', {
        taskType,
        timestamp: Date.now(),
      })

      await this.updateRoomAndNotify()

      // 任务完成后切换到下一个玩家
      console.log(`✅ 任务处理完成，切换到下一个玩家`)
      await this._nextPlayer()
    } else {
      const remainingCount = currentTask.executorTasks.filter(
        (et: { completed: boolean }) => !et.completed,
      ).length
      console.log(`⏳ 还有 ${remainingCount} 个执行者未完成任务，继续等待...`)
    }
  }

  async onEnd(_io?: SocketIOServer) {
    this.gamePhase = 'ended'
    this.room.gameStatus = 'ended'
    await this.updateRoomAndNotify()
    this.socket.to(this.room.id).emit('room:update', this.room)
  }
}

export default FlyingGame
