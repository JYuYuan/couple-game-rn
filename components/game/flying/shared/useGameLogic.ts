/**
 * Flying Chess 共享游戏逻辑 Hook
 * 提取offline和online模式中重复的游戏逻辑
 */

import { useCallback } from 'react'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { Player, TaskType, GameStatus } from './types'
import { PathCell } from '@/types/game'
import { TaskModalData } from '@/types/online'

// 定义GameTask类型(与use-game-tasks.ts保持一致)
interface GameTask {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  reward?: number
}

interface RewardInfo {
  playerId: string
  oldPosition: number
  newPosition: number
  moveSteps: number
  isForward: boolean
  actualSteps: number
}

export function useGameLogic(
  players: Player[],
  boardPath: PathCell[],
  gameStatus: GameStatus,
  getOpponentPlayer: (playerId: string) => Player | undefined,
  getRandomTask: () => GameTask | null,
  calculateTaskReward: (
    playerId: string,
    taskType: TaskType,
    completed: boolean,
  ) => RewardInfo | null,
) {
  const audioManager = useAudioManager()

  /**
   * 1. 胜利检查和处理
   */
  const checkAndHandleVictory = useCallback(
    (playerId: string, finalPosition: number) => {
      const finishPosition = boardPath.length - 1

      if (finalPosition >= finishPosition) {
        const player = players.find((p) => p.id === playerId)
        if (player && gameStatus === 'playing') {
          return { hasWinner: true, winner: player }
        }
      }

      return { hasWinner: false, winner: null }
    },
    [players, boardPath, gameStatus],
  )

  const handleVictory = useCallback(
    (player: Player) => {
      audioManager.playSoundEffect('victory').catch(console.error)
      // 返回胜利信息,由调用者处理UI
      return player
    },
    [audioManager],
  )

  /**
   * 2. 格子检查和任务触发
   */
  const checkCellAndTriggerTask = useCallback(
    (playerId: string, position: number): { hasTask: boolean; taskType?: TaskType } => {
      if (position < 0 || position >= boardPath.length) {
        return { hasTask: false }
      }

      const currentCell = boardPath[position]
      if (!currentCell) return { hasTask: false }

      // 检查碰撞
      const playersAtPosition = players.filter((p) => p.position === position && p.id !== playerId)
      if (playersAtPosition.length > 0) {
        return { hasTask: true, taskType: 'collision' }
      }

      // 检查特殊格子
      if (currentCell.type === 'trap') {
        return { hasTask: true, taskType: 'trap' }
      } else if (currentCell.type === 'star') {
        return { hasTask: true, taskType: 'star' }
      }

      return { hasTask: false }
    },
    [players, boardPath],
  )

  /**
   * 3. 准备任务数据
   */
  const prepareTaskData = useCallback(
    (taskType: TaskType, triggerPlayerId: string): TaskModalData | null => {
      const task = getRandomTask()
      if (!task) return null

      let executorPlayerId: string
      if (taskType === 'trap') {
        executorPlayerId = triggerPlayerId
      } else {
        const opponent = getOpponentPlayer(triggerPlayerId)
        executorPlayerId = opponent?.id || triggerPlayerId
      }

      const executorPlayer = players.find((p) => p.id === executorPlayerId)

      return {
        id: task.id,
        title: task.title,
        description: task.description || '',
        type: taskType,
        executors: executorPlayer ? [executorPlayer as any] : [], // 类型兼容性转换
        category: task.category,
        difficulty: task.difficulty,
        triggerPlayerIds: [triggerPlayerId],
      }
    },
    [players, getRandomTask, getOpponentPlayer],
  )

  /**
   * 4. 计算任务奖励后的移动
   */
  const calculateTaskMovement = useCallback(
    (executorPlayerId: string, taskType: TaskType, completed: boolean) => {
      return calculateTaskReward(executorPlayerId, taskType, completed)
    },
    [calculateTaskReward],
  )

  return {
    checkAndHandleVictory,
    handleVictory,
    checkCellAndTriggerTask,
    prepareTaskData,
    calculateTaskMovement,
  }
}
