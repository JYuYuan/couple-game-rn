/**
 * Flight Chess Game - P2P 版本
 * 复刻 server/games/flying/index.ts
 */

import type { MockSocketIO } from '../base-game'
import BaseGame from '../base-game'
import type { BaseRoom, NetworkPlayer, TaskModalData } from '@/types/online'
import { createBoardPath } from '@/utils/board'

// 🐾 游戏动作类型定义
type GameAction = {
  type: 'roll_dice' | 'move_complete' | 'complete_task'
  completed?: boolean
  [key: string]: any
}

class FlightChessGame extends BaseGame {
  constructor(room: BaseRoom, io: MockSocketIO) {
    super(room, io)
    console.log('🎮 飞行棋游戏实例创建')
  }

  async onStart() {
    console.log('🚀 开始飞行棋游戏')
    this.gamePhase = 'playing'
    this.room.gameStatus = 'playing'
    console.log('✅ gameStatus 已设置为 playing')
    this.room.tasks = this.room.taskSet?.tasks || []

    // 调试任务集信息
    console.log('📋 任务集检查:', {
      taskSetExists: !!this.room.taskSet,
      taskSetId: this.room.taskSet?.id,
      taskSetName: this.room.taskSet?.name,
      tasksCount: this.room.tasks?.length,
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
    this.room.players.forEach((player: NetworkPlayer) => {
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

    console.log('📤 准备调用 updateRoomAndNotify...')
    await this.updateRoomAndNotify()
    console.log('✅ updateRoomAndNotify 完成')
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

  async onPlayerAction(_io: MockSocketIO, playerId: string, action: unknown, callback?: Function) {
    console.log('🎯 [FlightChessGame] onPlayerAction 被调用!')
    console.log('🐛 [FlightChessGame] playerId:', playerId)
    console.log('🐛 [FlightChessGame] action:', JSON.stringify(action))
    console.log('🐛 [FlightChessGame] 当前游戏状态:', this.room.gameStatus)
    console.log('🐛 [FlightChessGame] 回调函数存在:', typeof callback === 'function')

    if (this.room.gameStatus !== 'playing') {
      console.warn('⚠️ [FlightChessGame] 游戏未在进行中，拒绝操作')
      callback?.({ success: false, error: '游戏未在进行中' })
      return
    }

    // 🐾 类型断言
    const gameAction = action as GameAction
    console.log('🎮 [FlightChessGame] 处理游戏动作, type:', gameAction.type)

    switch (gameAction.type) {
      case 'roll_dice':
        console.log('🎲 [FlightChessGame] 处理投骰子动作')
        await this._handleDiceRoll(playerId, callback)
        break
      case 'move_complete':
        console.log('🚶 [FlightChessGame] 处理移动完成动作')
        await this._handleMoveComplete(playerId)
        callback?.({ success: true })
        break
      case 'complete_task':
        console.log('📋 [FlightChessGame] 处理任务完成动作')
        await this._handleTaskComplete(playerId, gameAction)
        callback?.({ success: true })
        break
      default:
        console.warn('⚠️ [FlightChessGame] 未知的动作类型:', gameAction.type)
    }

    console.log('✅ [FlightChessGame] onPlayerAction 执行完成')
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
      // 如果没有任务，直接切换到下一个玩家
      await this._nextPlayer()
      return
    }

    // 确定执行者
    let executorNetworkPlayers: NetworkPlayer[] = []
    if (taskType === 'star' || taskType === 'collision') {
      // 星星任务和碰撞任务由对手执行
      executorNetworkPlayers = this.room.players.filter((p: NetworkPlayer) => p.id !== playerId)
    } else {
      // 陷阱任务由触发者执行
      const triggerPlayer = this.room.players.find((p: NetworkPlayer) => p.id === playerId)
      if (triggerPlayer) {
        executorNetworkPlayers = [triggerPlayer]
      }
    }

    // 将 NetworkPlayer 转换为 GamePlayer
    const executorPlayers = executorNetworkPlayers.map((networkPlayer) => ({
      id: parseInt(networkPlayer.id), // 转换 string 为 number
      name: networkPlayer.name || '',
      color: networkPlayer.color || '#FF6B6B',
      position: networkPlayer.position || 0,
      score: networkPlayer.score || 0,
      avatarId: networkPlayer.avatarId || '',
      gender: networkPlayer.gender || 'man',
      isAI: networkPlayer.isAI || false,
      completedTasks: networkPlayer.completedTasks || [],
      achievements: networkPlayer.achievements || [],
    }))

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

    // 保存任务到游戏状态，并标记有待处理的任务
    if (this.room.gameState) {
      this.room.gameState.currentTask = currentTask
      this.room.gameState.hasPendingTask = true // 标记有待处理的任务
    }

    // 发送独立的任务事件
    console.log(`📤 发送任务事件到房间 ${this.room.id}:`, {
      task: selectedTask,
      taskType,
      executorPlayerIds: executorNetworkPlayers.map((p) => p.id),
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
      executorPlayerIds: executorNetworkPlayers.map((p) => p.id),
      triggerPlayerIds: [playerId],
    })

    // 只更新房间基础状态，不发送gameState
    await this.updateRoomAndNotify()

    console.log(`⏸️ 任务已触发，等待玩家完成任务...`)
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

    const winner = this.room.players.find((p: NetworkPlayer) => p.id === winnerId)

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

  async _handleTaskComplete(playerId: string, action: GameAction) {
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

    // 获取执行者信息用于通知
    const executor = this.room.players.find((p: NetworkPlayer) => p.id === playerId)
    const executorName = executor?.name || '玩家'

    // 广播任务完成事件，通知所有玩家关闭弹窗并显示完成情况
    this.socket.to(this.room.id).emit('game:task_completed', {
      playerId,
      playerName: executorName,
      taskType,
      completed,
      taskTitle: currentTask.title,
    })

    // 根据任务类型和完成状态决定位置变化
    const step = Math.floor(Math.random() * 4) + 3
    let positionChange = completed ? step : -step

    if (taskType === 'star') {
      console.log(`⭐ 星星任务成功，前进${positionChange}格`)
    } else if (taskType === 'trap') {
      console.log(`🕳️ 陷阱任务失败，后退${Math.abs(positionChange)}格`)
    } else if (taskType === 'collision') {
      // 碰撞任务不改变位置，只是完成任务
      console.log(`💥 碰撞任务完成，位置归 0`)
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

      if (taskType === 'collision' && !completed) newPos = 0
      // 使用统一的位置更新方法
      this.updatePlayerPosition(playerId, newPos)

      console.log(
        `📍 任务后位置更新: ${playerId} 从 ${currentPos} 移动到 ${newPos} (变化: ${positionChange})`,
      )

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
      this.room.tasks = this.room.tasks.filter((task) => task !== currentTask.description)
    }

    // 清除当前任务和待处理标志
    if (this.room.gameState) {
      delete this.room.gameState.currentTask
      this.room.gameState.hasPendingTask = false // 清除待处理任务标志
    }
    console.log(this.room)
    // 更新房间状态
    await this.updateRoomAndNotify()

    // 检查胜利条件
    await this._checkWinCondition()

    // 任务完成后切换到下一个玩家
    console.log(`✅ 任务处理完成，切换到下一个玩家`)
    await this._nextPlayer()
  }

  async onEnd(_io?: MockSocketIO) {
    this.gamePhase = 'ended'
    this.room.gameStatus = 'ended'
    await this.updateRoomAndNotify()
    this.socket.to(this.room.id).emit('room:update', this.room)
  }
}

export default FlightChessGame
