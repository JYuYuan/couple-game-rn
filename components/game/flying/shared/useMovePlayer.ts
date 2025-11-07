/**
 * Flying Chess 玩家移动逻辑 Hook
 * 处理玩家逐步移动、反弹逻辑和音效
 */

import { useCallback } from 'react'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { Player, GameStatus } from './types'
import { PathCell } from '@/types/game'

export function useMovePlayer(
  players: Player[],
  boardPath: PathCell[],
  gameStatus: GameStatus,
  movePlayerPosition: (playerId: number, position: number) => void
) {
  const audioManager = useAudioManager()

  /**
   * 逐步移动玩家
   * @param playerId 玩家ID
   * @param steps 移动步数
   * @param isForward 是否向前移动
   * @param onComplete 移动完成回调
   */
  const movePlayerStepByStep = useCallback(
    (
      playerId: number,
      steps: number,
      isForward: boolean = true,
      onComplete?: (playerId: number, finalPosition: number) => void
    ) => {
      const player = players.find((p) => p.id === playerId)
      if (!player || gameStatus !== 'playing') return

      const startPosition = player.position
      if (startPosition === undefined) return // 添加非空检查

      const finishLine = boardPath.length - 1
      let stepCount = 0
      let targetPosition: number

      // 计算目标位置
      if (isForward) {
        if (startPosition + steps > finishLine) {
          // 反弹逻辑
          const excess = startPosition + steps - finishLine
          targetPosition = finishLine - excess
        } else {
          targetPosition = startPosition + steps
        }
      } else {
        targetPosition = Math.max(startPosition - steps, 0)
      }

      // 确保位置在有效范围内
      targetPosition = Math.max(0, Math.min(finishLine, targetPosition))

      const moveOneStep = () => {
        if (stepCount < steps && gameStatus === 'playing') {
          stepCount++
          let currentPosition: number

          if (isForward) {
            const currentStep = startPosition + stepCount
            if (currentStep <= finishLine) {
              currentPosition = currentStep
            } else {
              // 反弹计算
              const stepsFromFinish = currentStep - finishLine
              currentPosition = finishLine - stepsFromFinish
            }
          } else {
            currentPosition = Math.max(startPosition - stepCount, 0)
          }

          // 确保位置在有效范围内
          currentPosition = Math.max(0, Math.min(finishLine, currentPosition))
          movePlayerPosition(playerId, currentPosition)
          audioManager.playSoundEffect('step').catch(console.error)

          if (stepCount < steps) {
            // 继续下一步
            setTimeout(moveOneStep, 400)
          } else {
            // 移动完成
            if (onComplete) {
              setTimeout(() => onComplete(playerId, targetPosition), 300)
            }
          }
        }
      }

      moveOneStep()
    },
    [players, boardPath, gameStatus, movePlayerPosition, audioManager]
  )

  return { movePlayerStepByStep }
}
