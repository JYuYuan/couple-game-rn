/**
 * Flying Chess 离线模式 - 适配器
 * 简化为适配器模式,使用GameCore统一UI
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { usePageBase } from '@/hooks/usePageBase'
import { useGamePlayers, GamePlayer } from '@/hooks/use-game-players'
import { useGameTasks } from '@/hooks/use-game-tasks'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { createBoardPath } from '@/utils/board'
import GameCore from './shared/GameCore'
import { useGameLogic } from './shared/useGameLogic'
import { useMovePlayer } from './shared/useMovePlayer'
import { TaskModalData } from '@/types/online'
import { PathCell } from '@/types/game'

export default function OfflineGame() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { colors, t } = usePageBase()
  const audioManager = useAudioManager()

  const taskSetId = params.taskSetId as string
  const gameTasks = useGameTasks(taskSetId)
  const gamePlayersHook = useGamePlayers(2, 49)

  const {
    players,
    currentPlayerIndex,
    currentPlayer,
    gameStatus,
    startGame,
    resetGame,
    nextPlayer,
    movePlayer,
    getOpponentPlayer,
    calculateTaskReward,
    endGame,
  } = gamePlayersHook

  // 本地状态
  const [diceValue, setDiceValue] = useState(0)
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [pendingTaskType, setPendingTaskType] = useState<'trap' | 'star' | 'collision' | null>(null)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)
  const [boardPath, setBoardPath] = useState<PathCell[]>([])

  // 动画
  const diceRotation = useSharedValue(0)
  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  // 使用共享逻辑
  const gameLogic = useGameLogic(
    players,
    boardPath,
    gameStatus,
    (playerId) => getOpponentPlayer(playerId) || undefined, // 类型转换包装
    gameTasks.getRandomTask,
    calculateTaskReward,
  )

  const { movePlayerStepByStep } = useMovePlayer(players, boardPath, gameStatus, movePlayer)

  // 初始化
  useEffect(() => {
    const newBoard = createBoardPath()
    setBoardPath(newBoard)
  }, [])

  useEffect(() => {
    if (gameStatus === 'waiting' && gameTasks.selectedTaskSet && boardPath.length > 0) {
      startGame()
    }
  }, [gameStatus, gameTasks.selectedTaskSet, boardPath.length, startGame])

  // 骰子逻辑 (本地特有)
  const handleDiceRoll = () => {
    if (isRolling || isMoving) return

    setIsRolling(true)
    audioManager.playSoundEffect('dice').catch(console.error)
    diceRotation.value = withTiming(360 * 4, { duration: 1200 })

    setTimeout(() => {
      const newDiceValue = Math.floor(Math.random() * 6) + 1
      setDiceValue(newDiceValue)

      setTimeout(() => {
        setIsRolling(false)
        setIsMoving(true)
        diceRotation.value = 0

        movePlayerStepByStep(currentPlayer.id, newDiceValue, true, (playerId, finalPosition) => {
          setIsMoving(false)

          // 检查胜利
          const victoryResult = gameLogic.checkAndHandleVictory(playerId, finalPosition)
          if (victoryResult.hasWinner && victoryResult.winner) {
            endGame()
            gameLogic.handleVictory(victoryResult.winner)
            setWinner(victoryResult.winner as GamePlayer)
            setShowVictoryModal(true)
            return
          }

          // 检查任务
          const taskResult = gameLogic.checkCellAndTriggerTask(playerId, finalPosition)
          if (taskResult.hasTask && taskResult.taskType) {
            const taskData = gameLogic.prepareTaskData(taskResult.taskType, playerId)
            if (taskData) {
              setTaskModalData(taskData)
              setPendingTaskType(taskResult.taskType)
              setShowTaskModal(true)
            }
          } else if (gameStatus === 'playing') {
            setTimeout(() => {
              setDiceValue(0)
              nextPlayer()
            }, 500)
          }
        })
      }, 1000)
    }, 1200)
  }

  // 任务完成处理
  const handleTaskComplete = (completed: boolean) => {
    if (!taskModalData || !pendingTaskType) return

    const executorPlayerId = taskModalData.executors[0]?.id
    const rewardInfo = gameLogic.calculateTaskMovement(executorPlayerId, pendingTaskType, completed)

    setShowTaskModal(false)
    setTaskModalData(null)
    setPendingTaskType(null)

    // 特殊处理碰撞任务失败
    if (pendingTaskType === 'collision' && !completed) {
      movePlayer(executorPlayerId, 0)
      setTimeout(() => {
        if (gameStatus === 'playing') {
          setDiceValue(0)
          nextPlayer()
        }
      }, 500)
      return
    }

    if (rewardInfo && rewardInfo.actualSteps > 0) {
      setIsMoving(true)
      movePlayerStepByStep(
        executorPlayerId,
        rewardInfo.actualSteps,
        rewardInfo.isForward,
        (playerId, finalPosition) => {
          setIsMoving(false)

          const victoryResult = gameLogic.checkAndHandleVictory(playerId, finalPosition)
          if (victoryResult.hasWinner && victoryResult.winner) {
            endGame()
            gameLogic.handleVictory(victoryResult.winner)
            setWinner(victoryResult.winner as GamePlayer)
            setShowVictoryModal(true)
            return
          }

          if (gameStatus === 'playing') {
            setTimeout(() => {
              setDiceValue(0)
              nextPlayer()
            }, 100)
          }
        },
      )
    } else {
      setTimeout(() => {
        if (gameStatus === 'playing') {
          setDiceValue(0)
          nextPlayer()
        }
      }, 300)
    }
  }

  const handleResetGame = () => {
    resetGame()
    setDiceValue(0)
    setIsRolling(false)
    setIsMoving(false)
    setShowTaskModal(false)
    setTaskModalData(null)
    setPendingTaskType(null)
    setShowVictoryModal(false)
    setWinner(null)
    diceRotation.value = 0
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${gameTasks.selectedTaskSet?.name || ''}-${t('flyingChess.title', '飞行棋')}`,
          headerShown: true,
          headerStyle: { backgroundColor: colors.homeBackground },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerBackTitle: t('flyingChess.headerBackTitle', '返回'),
        }}
      />
      <GameCore
        mode="offline"
        gameStatus={gameStatus}
        players={players}
        currentPlayer={currentPlayer}
        currentPlayerIndex={currentPlayerIndex}
        boardPath={boardPath}
        diceValue={diceValue}
        isRolling={isRolling}
        isMoving={isMoving}
        showTaskModal={showTaskModal}
        taskModalData={taskModalData}
        showVictoryModal={showVictoryModal}
        winner={winner}
        onDiceRoll={handleDiceRoll}
        onTaskComplete={handleTaskComplete}
        onResetGame={handleResetGame}
        onExit={() => router.back()}
        colors={colors}
        t={t}
        diceAnimatedStyle={diceAnimatedStyle}
      />
    </>
  )
}
