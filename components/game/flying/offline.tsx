import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import GameBoard from '@/components/GameBoard'
import TaskModal from '@/components/TaskModal'
import { TaskModalData } from '@/types/online'
import VictoryModal from '@/components/VictoryModal'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useGameTasks } from '@/hooks/use-game-tasks'
import { GamePlayer, useGamePlayers } from '@/hooks/use-game-players'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { createBoardPath } from '@/utils/board'
import { PathCell } from '@/types/game'
import { useTranslation } from 'react-i18next'

export default function OfflineGame() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  // 获取传入的参数
  const taskSetId = params.taskSetId as string

  // 使用hooks，传入分类参数
  const gameTasks = useGameTasks(taskSetId)
  const gamePlayersHook = useGamePlayers(2, 49) // 7x7 = 49格
  const audioManager = useAudioManager()
  const {
    players,
    currentPlayerIndex,
    currentPlayer,
    gameStatus,
    startGame,
    resetGame,
    nextPlayer,
    movePlayer,
    checkWinCondition,
    calculateTaskReward,
    endGame,
    getOpponentPlayer,
  } = gamePlayersHook

  // 游戏状态
  const [diceValue, setDiceValue] = useState(0)
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [pendingTaskType, setPendingTaskType] = useState<'trap' | 'star' | 'collision' | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)

  // 棋盘数据
  const [boardPath, setBoardPath] = useState<PathCell[]>([])

  // 进入页面时自动开始游戏
  useEffect(() => {
    if (gameStatus === 'waiting' && gameTasks.selectedTaskSet && boardPath.length > 0) {
      startGame()
    }
  }, [gameStatus, gameTasks.selectedTaskSet, boardPath.length, startGame])

  // 初始化棋盘
  useEffect(() => {
    const newBoard = createBoardPath()
    setBoardPath(newBoard)
  }, [])

  // 动画值
  const diceRotation = useSharedValue(0)

  // 统一的胜利检查函数
  const checkAndHandleVictory = (playerId: number, finalPosition: number): boolean => {
    const finishPosition = boardPath.length - 1

    // 首先检查是否到达终点
    if (finalPosition >= finishPosition) {
      const player = players.find((p) => p.id === playerId)
      if (player && gameStatus === 'playing') {
        console.log(`Victory! Player ${playerId} reached finish line at position ${finishPosition}`)
        handleVictory(player)
        return true
      }
    }

    // 使用hook的胜利检查作为补充
    const winResult = checkWinCondition(playerId, finalPosition)
    if (winResult.hasWinner && winResult.winner && gameStatus === 'playing') {
      console.log('Victory detected by hook:', winResult.winner)
      handleVictory(winResult.winner)
      return true
    }

    return false
  }

  // 处理胜利
  const handleVictory = (victoryPlayer: GamePlayer) => {
    console.log('Game victory! Winner:', victoryPlayer.name)

    // 立即设置游戏状态为结束，防止继续游戏
    if (gameStatus === 'playing') {
      console.log('Setting game status to ended')
      endGame()
    }

    // 播放胜利音效
    audioManager.playSoundEffect('victory').catch(console.error)

    setWinner(victoryPlayer)
    setShowVictoryModal(true)
  }

  // 检查格子类型并触发任务
  const checkCellAndTriggerTask = (playerId: number, position: number) => {
    console.log(`Checking special cell at position ${position}, player ID: ${playerId}`)

    // 检查位置是否有效
    if (position < 0 || position >= boardPath.length) {
      console.log(`Position ${position} out of board range`)
      return false // 返回false表示没有任务触发
    }

    const currentCell = boardPath[position]
    if (!currentCell) {
      console.log(`Cell data at position ${position} does not exist`)
      return false
    }

    console.log(`Cell type at position ${position}: ${currentCell.type}`)

    // 检查是否有其他玩家在相同位置（碰撞）
    const playersAtPosition = players.filter((p) => p.position === position && p.id !== playerId)
    console.log(playersAtPosition)
    if (playersAtPosition.length > 0) {
      console.log(`Collision detected at position ${position}`)
      triggerTask('collision', playerId)
      return true // 返回true表示有任务触发
    }

    // 检查特殊格子
    if (currentCell.type === 'trap') {
      console.log(`Triggered trap task at position ${position}`)
      triggerTask('trap', playerId)
      return true
    } else if (currentCell.type === 'star') {
      console.log(`Triggered star task at position ${position}`)
      triggerTask('star', playerId)
      return true
    } else {
      console.log(`Position ${position} is a normal cell (${currentCell.type})`)
      return false
    }
  }

  // 触发任务弹窗
  const triggerTask = (taskType: 'trap' | 'star' | 'collision', triggerPlayerId: number) => {
    console.log(`Triggered task: type=${taskType}, trigger player ID=${triggerPlayerId}`)

    const task = gameTasks.getRandomTask()
    console.log('Retrieved task:', task)

    if (!task) {
      console.log('Failed to retrieve task')
      return
    }

    // 根据任务类型确定执行者
    let executorPlayerId: number
    let executorType: 'self' | 'opponent'

    if (taskType === 'trap') {
      // 陷阱任务：触发者自己执行
      executorPlayerId = triggerPlayerId
      executorType = 'self'
    } else {
      // 星星任务和碰撞任务：对手执行
      const opponentPlayer = getOpponentPlayer(triggerPlayerId)
      executorPlayerId = opponentPlayer?.id || triggerPlayerId
      executorType = 'opponent'
    }

    console.log(`Executor ID: ${executorPlayerId}, type: ${executorType}`)

    const executorPlayer = players.find((p) => p.id === executorPlayerId)
    const taskData: TaskModalData = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      type: taskType,
      executors: executorPlayer ? [executorPlayer] : [],
      category: task.category,
      difficulty: task.difficulty,
      triggerPlayerIds: [triggerPlayerId],
      isExecutor: true,
    }

    setTaskModalData(taskData)
    setPendingTaskType(taskType)
    setShowTaskModal(true)
  }

  // 处理任务完成结果（优化版）
  const handleTaskComplete = (completed: boolean) => {
    console.log(taskModalData, pendingTaskType)
    if (!taskModalData || !pendingTaskType) return

    const triggerPlayerId = taskModalData.triggerPlayerIds[0]
    const executorPlayerId = taskModalData.executors[0]?.id

    console.log(
      `Task completed: type=${pendingTaskType}, trigger=${triggerPlayerId}, executor=${executorPlayerId}, completed=${completed}`,
    )

    // 计算任务奖惩信息
    const rewardInfo = calculateTaskReward(executorPlayerId, pendingTaskType, completed)

    // 关闭弹窗并重置状态
    setShowTaskModal(false)
    setTaskModalData(null)
    setPendingTaskType(null)

    if (rewardInfo && rewardInfo.actualSteps > 0) {
      console.log(
        `Task reward: Player ${executorPlayerId} will move ${rewardInfo.actualSteps} steps ${rewardInfo.isForward ? 'forward' : 'backward'}`,
      )

      // 设置移动状态
      setIsMoving(true)

      // 特殊处理碰撞任务失败
      if (pendingTaskType === 'collision' && !completed) {
        movePlayer(executorPlayerId, 0)
        setTimeout(() => {
          setIsMoving(false)
          handleTaskCompleteCallback(executorPlayerId, 0)
        }, 500)
      } else {
        // 使用统一的移动函数
        movePlayerStepByStep(
          executorPlayerId,
          rewardInfo.actualSteps,
          rewardInfo.isForward,
          (playerId, finalPosition) => {
            setIsMoving(false)
            handleTaskCompleteCallback(playerId, finalPosition)
          },
        )
      }
    } else {
      // 没有移动，直接处理后续逻辑
      const currentPosition = players.find((p) => p.id === executorPlayerId)?.position || 0
      setTimeout(() => {
        handleTaskCompleteCallback(executorPlayerId, currentPosition)
      }, 300)
    }
  }

  // 任务完成后的回调处理（简化版）
  const handleTaskCompleteCallback = (playerId: number, finalPosition: number) => {
    console.log(`Task movement completed: Player ${playerId} at position ${finalPosition}`)

    // 统一的胜利检查
    const hasWon = checkAndHandleVictory(playerId, finalPosition)

    if (!hasWon && gameStatus === 'playing') {
      // 如果没有获胜，切换到下一个玩家
      setTimeout(() => {
        setDiceValue(0)
        nextPlayer()
        console.log('Task completed, switching to next player')
      }, 100)
    }
  }

  const rollDice = () => {
    if (isRolling || isMoving) return

    setIsRolling(true)

    // 播放骰子音效
    audioManager.playSoundEffect('dice').catch(console.error)

    // 骰子旋转动画
    diceRotation.value = withTiming(360 * 4, { duration: 1200 })

    // 生成随机数
    setTimeout(() => {
      const newDiceValue = Math.floor(Math.random() * 6) + 1
      setDiceValue(newDiceValue)

      // 投掷完成，直接开始移动（不重置isRolling状态）
      setTimeout(() => {
        setIsRolling(false)
        setIsMoving(true)
        diceRotation.value = 0

        // 移动当前玩家，使用统一的移动函数
        movePlayerStepByStep(
          currentPlayer.id,
          newDiceValue,
          true,
          (playerId: number, finalPosition: number) => {
            // 移动完成的回调函数
            setIsMoving(false)

            // 统一的胜利检查
            const hasWon = checkAndHandleVictory(playerId, finalPosition)
            if (hasWon) return

            // 检查是否触发了任务
            const hasTask = checkCellAndTriggerTask(playerId, finalPosition)

            // 如果没有任务触发且游戏仍在进行，切换玩家
            if (!hasTask && gameStatus === 'playing') {
              setTimeout(() => {
                setDiceValue(0)
                nextPlayer()
                console.log('No task triggered, switching to next player')
              }, 500)
            } else if (hasTask) {
              console.log('Task triggered, waiting for task completion')
            }
          },
        )
      }, 1000)
    }, 1200)
  }

  // 统一的逐步移动函数
  const movePlayerStepByStep = (
    playerId: number,
    steps: number,
    isForward: boolean = true,
    onComplete?: (playerId: number, finalPosition: number) => void,
  ) => {
    const player = players.find((p) => p.id === playerId)
    if (!player || gameStatus !== 'playing') return

    const startPosition = player.position
    const finishLine = boardPath.length - 1
    let stepCount = 0
    let targetPosition: number

    // 计算目标位置
    if (isForward) {
      // 前进逻辑：考虑反弹
      if (startPosition + steps > finishLine) {
        const excess = startPosition + steps - finishLine
        targetPosition = finishLine - excess
      } else {
        targetPosition = startPosition + steps
      }
    } else {
      // 后退逻辑：简单后退
      targetPosition = Math.max(startPosition - steps, 0)
    }

    // 确保位置在有效范围内
    targetPosition = Math.max(0, Math.min(finishLine, targetPosition))

    console.log(
      `Moving player ${playerId} from ${startPosition} ${isForward ? 'forward' : 'backward'} ${steps} steps to ${targetPosition}`,
    )

    const moveOneStep = () => {
      if (stepCount < steps && gameStatus === 'playing') {
        stepCount++
        let currentPosition: number

        if (isForward) {
          // 前进移动
          const currentStep = startPosition + stepCount
          if (currentStep <= finishLine) {
            currentPosition = currentStep
          } else {
            // 反弹逻辑
            const stepsFromFinish = currentStep - finishLine
            currentPosition = finishLine - stepsFromFinish
          }
        } else {
          // 后退移动
          currentPosition = Math.max(startPosition - stepCount, 0)
        }

        // 确保位置有效
        currentPosition = Math.max(0, Math.min(finishLine, currentPosition))
        movePlayer(playerId, currentPosition)

        // 播放移动音效
        audioManager.playSoundEffect('step').catch(console.error)

        if (stepCount < steps) {
          setTimeout(moveOneStep, 400)
        } else {
          // 移动完成
          console.log(`Movement completed! Player ${playerId} at position ${targetPosition}`)
          if (onComplete) {
            setTimeout(() => onComplete(playerId, targetPosition), 300)
          }
        }
      }
    }

    moveOneStep()
  }

  const handleResetGame = () => {
    // 重置游戏状态
    resetGame()

    // 清理UI状态
    setDiceValue(0)
    setIsRolling(false)
    setIsMoving(false)
    setShowTaskModal(false)
    setTaskModalData(null)
    setPendingTaskType(null)
    setShowVictoryModal(false)
    setWinner(null)

    // 重置动画
    diceRotation.value = 0

    console.log('Game reset completed')
  }

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  return (
    <>
      <Stack.Screen
        options={{
          title: `${gameTasks.selectedTaskSet?.name || ''}-${t('flyingChess.title', '飞行棋')}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('flyingChess.headerBackTitle', '返回'),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
        {/* 背景渐变 */}
        <LinearGradient
          colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 游戏状态栏 */}
          <View style={[styles.statusBar, { backgroundColor: colors.homeCardBackground }]}>
            <View style={styles.statusLeft}>
              <Text style={[styles.statusTitle, { color: colors.homeCardTitle }]}>
                {gameStatus === 'waiting'
                  ? t('flyingChess.gameStatus.waiting', '准备开始')
                  : gameStatus === 'playing'
                    ? t('flyingChess.gameStatus.playing', '游戏进行中')
                    : t('flyingChess.gameStatus.finished', '游戏结束')}
              </Text>
              {gameStatus === 'playing' && (
                <Text style={[styles.currentPlayerText, { color: currentPlayer.color }]}>
                  {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: currentPlayer.name,
                  })}
                </Text>
              )}
            </View>

            {gameStatus === 'playing' && (
              <View style={styles.diceContainer}>
                <View style={styles.diceWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.diceButton,
                      {
                        backgroundColor: isRolling || isMoving ? '#FF6B6B' : colors.settingsAccent,
                        borderWidth: 3,
                        borderColor: 'white',
                        opacity: isRolling || isMoving ? 0.6 : 1,
                      },
                    ]}
                    onPress={rollDice}
                    disabled={isRolling || isMoving}
                    activeOpacity={0.8}
                  >
                    {isRolling ? (
                      <Animated.View style={diceAnimatedStyle}>
                        <Text style={styles.diceEmoji}>🎲</Text>
                      </Animated.View>
                    ) : (
                      <Text style={[styles.diceResultText, { color: 'white' }]}>
                        {diceValue || '🎲'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.diceText,
                    { color: colors.homeCardDescription, fontWeight: '600' },
                  ]}
                >
                  {isRolling
                    ? t('flyingChess.dice.rolling', '投掷中...')
                    : isMoving
                      ? t('flyingChess.dice.moving', '棋子移动中...')
                      : t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
                </Text>
              </View>
            )}
          </View>

          {/* 玩家信息 */}
          <View style={[styles.playersInfo, { backgroundColor: colors.homeCardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
              {t('flyingChess.playersStatus', '玩家状态')}
            </Text>
            <View style={styles.playersGrid}>
              {players.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: player.color + '15',
                      borderColor: currentPlayerIndex === index ? player.color : 'transparent',
                      borderWidth: currentPlayerIndex === index ? 2 : 0,
                    },
                  ]}
                >
                  <PlayerAvatar avatarId={player.avatarId || ''} color={player.color} size={32} />
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                      {player.name}
                    </Text>
                    <Text style={[styles.playerPosition, { color: colors.homeCardDescription }]}>
                      {t('flyingChess.position', '位置: {{position}}', {
                        position: player.position + 1,
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 游戏棋盘 */}
          <View style={[styles.boardSection, { backgroundColor: colors.homeCardBackground }]}>
            <GameBoard players={players} boardData={boardPath} currentPlayer={currentPlayerIndex} />
          </View>
        </ScrollView>
      </View>

      {/* 任务弹窗 */}
      <TaskModal
        visible={showTaskModal}
        task={taskModalData}
        players={players}
        onComplete={handleTaskComplete}
        onClose={() => setShowTaskModal(false)}
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={winner}
        isWinner={true}
        onRestart={() => {
          handleResetGame()
          setShowVictoryModal(false)
        }}
        onExit={() => {
          setShowVictoryModal(false)
          router.back()
        }}
        onClose={() => setShowVictoryModal(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentPlayerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diceContainer: {
    alignItems: 'center',
    gap: 12,
  },
  diceWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    zIndex: 0,
  },
  diceGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  diceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },
  diceEmoji: {
    fontSize: 32,
  },
  diceResultText: {
    fontSize: 24,
    fontWeight: '700',
  },
  diceText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  playersInfo: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  playersGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
  },
  boardSection: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
})
