import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { usePageBase } from '@/hooks/usePageBase'
import { spacing } from '@/constants/commonStyles'
import WheelOfFortune, { WheelOfFortuneRef } from '@/components/WheelOfFortune'
import SimpleTaskModal, { SimpleTaskData } from '@/components/SimpleTaskModal'
import VictoryModal from '@/components/VictoryModal'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useGameTasks } from '@/hooks/use-game-tasks'
import { useWheelGame, WheelPlayer, WheelResult } from '@/hooks/use-wheel-game'
import { showConfirmDialog } from '@/components/ConfirmDialog'

export default function WheelPointsGame() {
  const { t, router, colors } = usePageBase()
  const params = useLocalSearchParams()
  const wheelRef = useRef<WheelOfFortuneRef>(null)

  // 获取传入的参数
  const taskSetId = params.taskSetId as string

  // 使用hooks
  const gameTasks = useGameTasks(taskSetId)
  const wheelGame = useWheelGame()
  const {
    players,
    currentPlayerIndex,
    currentPlayer,
    gameStatus,
    rounds,
    winningScore,
    startGame,
    resetGame,
    nextPlayer,
    completeTask,
    checkWinCondition,
    applyWheelResult,
    generateRandomScore,
    isGameActive,
  } = wheelGame

  // 游戏状态
  const [isSpinning, setIsSpinning] = useState(false)
  const [pendingWheelResult, setPendingWheelResult] = useState<WheelResult | null>(null)

  // 简单任务弹窗状态
  const [showSimpleTaskModal, setShowSimpleTaskModal] = useState(false)
  const [simpleTaskData, setSimpleTaskData] = useState<SimpleTaskData | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<WheelPlayer | null>(null)

  // 进入页面时自动开始游戏
  useEffect(() => {
    if (gameStatus === 'waiting' && gameTasks.selectedTaskSet) {
      startGame()
    }
  }, [gameStatus, gameTasks.selectedTaskSet, startGame])

  // 处理胜利
  const handleVictory = (victoryPlayer: WheelPlayer) => {
    console.log('游戏胜利！获胜者:', victoryPlayer.name, '分数:', victoryPlayer.score)
    setWinner(victoryPlayer)
    setShowVictoryModal(true)
  }

  // 重置游戏
  const handleResetGame = () => {
    resetGame()
    setIsSpinning(false)
    setShowSimpleTaskModal(false)
    setSimpleTaskData(null)
    setPendingWheelResult(null)
  }

  // 转盘旋转
  const handleSpin = () => {
    if (isSpinning || !isGameActive) return

    setIsSpinning(true)
    wheelRef.current?.spin()
  }

  // 转盘结果处理
  const handleSpinComplete = async (result: WheelResult) => {
    console.log('转盘结果:', result)
    setIsSpinning(false)

    // 显示结果提示
    const comfirmed = await showConfirmDialog({
      title: t('wheelPoints.wheelResult', '转盘结果'),
      message: t('wheelPoints.resultMessage', '{{playerName}} 转到了: {{result}}', {
        playerName: currentPlayer.name,
        result: result.label,
      }),
    })
    if (comfirmed) processWheelResult(result)
  }

  // 处理转盘结果 - 所有区域都触发任务
  const processWheelResult = (result: WheelResult) => {
    const needsTask = applyWheelResult(result, currentPlayer.id)

    if (needsTask) {
      // 需要执行任务
      triggerTask(currentPlayer.id, result)
      setPendingWheelResult(result)
    } else {
      // 额外转盘机会，不切换玩家
      setTimeout(() => {
        checkWinCondition((winner) => {
          handleVictory(winner)
        })
      }, 1000)
    }
  }

  // 触发任务弹窗
  const triggerTask = (triggerPlayerId: string, wheelResult: WheelResult) => {
    console.log(`触发任务：触发者ID=${triggerPlayerId}, 转盘结果:`, wheelResult)

    const task = gameTasks.getRandomTask()
    console.log('获取到的任务：', task)

    if (!task) {
      console.log('任务获取失败')
      return
    }

    // 生成随机积分 (1-10分)
    const randomScore = generateRandomScore()

    const simpleTask: SimpleTaskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      points: randomScore,
    }

    setSimpleTaskData(simpleTask)
    setShowSimpleTaskModal(true)
  }

  // 处理任务完成结果
  const handleTaskComplete = (completed: boolean) => {
    if (!simpleTaskData || !pendingWheelResult) return

    const executorPlayerId = currentPlayer?.id
    if (!executorPlayerId) return

    console.log(
      `任务完成: 执行者=${executorPlayerId}, 完成=${completed}, 积分=${simpleTaskData.points}`,
    )

    // 应用任务奖惩：完成获得积分，失败扣减一半
    completeTask(executorPlayerId, simpleTaskData.id, simpleTaskData.points, completed)

    // 关闭弹窗并重置状态
    setShowSimpleTaskModal(false)
    setSimpleTaskData(null)
    setPendingWheelResult(null)

    // 任务完成后检查胜利条件并切换玩家
    setTimeout(() => {
      checkWinCondition((winner) => {
        handleVictory(winner)
      })

      // 如果游戏仍在进行中，切换到下一个玩家
      if (gameStatus === 'playing') {
        setTimeout(() => {
          nextPlayer()
          console.log('任务完成，切换到下一个玩家')
        }, 500)
      }
    }, 1000)
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: `${gameTasks.selectedTaskSet?.name || ''}-${t('wheelPoints.title', '转盘积分')}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('wheelPoints.headerBackTitle', '返回'),
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

        {/* 顶部玩家HUD - 半透明浮动 */}
        <View style={styles.playersHUD}>
          {players.map((player, index) => {
            const progress = (player.score / winningScore) * 100
            const isCurrentPlayer = currentPlayerIndex === index
            const isLeftPlayer = index === 0

            return (
              <View
                key={player.id}
                style={[
                  styles.playerHUDCard,
                  {
                    alignItems: isLeftPlayer ? 'flex-start' : 'flex-end',
                  },
                ]}
              >
                <View
                  style={[
                    styles.playerHUDContent,
                    {
                      flexDirection: isLeftPlayer ? 'row' : 'row-reverse',
                      backgroundColor: colors.homeCardBackground + 'CC',
                      borderColor: isCurrentPlayer ? player.color : 'transparent',
                      borderWidth: isCurrentPlayer ? 2 : 0,
                    },
                  ]}
                >
                  <PlayerAvatar avatarId={player.avatarId || ''} color={player.color} size={48} />
                  <View
                    style={[
                      styles.playerHUDInfo,
                      { alignItems: isLeftPlayer ? 'flex-start' : 'flex-end' },
                    ]}
                  >
                    <Text style={[styles.playerHUDName, { color: colors.homeCardTitle }]}>
                      {player.name}
                    </Text>
                    <Text style={[styles.playerHUDScore, { color: player.color }]}>
                      {player.score} / {winningScore}
                    </Text>
                    <View
                      style={[
                        styles.miniProgressBar,
                        { backgroundColor: colors.homeCardDescription + '30' },
                      ]}
                    >
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: player.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* 中央转盘区域 */}
        <View style={styles.wheelCenterSection}>
          <WheelOfFortune
            ref={wheelRef}
            onSpinComplete={handleSpinComplete}
            disabled={!isGameActive || isSpinning}
          />
        </View>

        {/* 底部操作区 */}
        <View style={styles.bottomSection}>
          {/* 游戏状态指示 */}
          <View
            style={[styles.statusIndicator, { backgroundColor: colors.homeCardBackground + 'CC' }]}
          >
            <View style={styles.statusContent}>
              {gameStatus === 'playing' ? (
                <>
                  <View style={[styles.statusDot, { backgroundColor: currentPlayer.color }]} />
                  <Text style={[styles.statusText, { color: colors.homeCardTitle }]}>
                    {t('wheelPoints.currentPlayer', '轮到 {{playerName}}', {
                      playerName: currentPlayer.name,
                    })}
                  </Text>
                  <Text style={[styles.roundBadge, { color: colors.homeCardDescription }]}>
                    {t('wheelPoints.round', '第 {{round}} 轮', { round: rounds + 1 })}
                  </Text>
                </>
              ) : (
                <Text style={[styles.statusText, { color: colors.homeCardTitle }]}>
                  {gameStatus === 'waiting'
                    ? t('wheelPoints.gameStatus.waiting', '准备开始')
                    : t('wheelPoints.gameStatus.finished', '游戏结束')}
                </Text>
              )}
            </View>
          </View>

          {/* 旋转按钮 */}
          {gameStatus === 'playing' && (
            <TouchableOpacity
              style={[
                styles.floatingSpinButton,
                {
                  opacity: isSpinning ? 0.6 : 1,
                },
              ]}
              onPress={handleSpin}
              disabled={isSpinning}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isSpinning
                    ? [colors.error, colors.error + 'DD']
                    : [colors.success, colors.success + 'DD']
                }
                style={styles.floatingSpinButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isSpinning ? 'hourglass-outline' : 'play-circle'}
                  size={32}
                  color="white"
                />
                <Text style={styles.floatingSpinButtonText}>
                  {isSpinning
                    ? t('wheelPoints.spin.spinning', '旋转中...')
                    : t('wheelPoints.spin.start', '开始转盘')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 简单任务弹窗 */}
      <SimpleTaskModal
        visible={showSimpleTaskModal}
        task={simpleTaskData}
        onComplete={handleTaskComplete}
        onClose={() => setShowSimpleTaskModal(false)}
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={
          winner
            ? ({
                ...winner,
                position: 0, // 转盘游戏不需要位置，设为默认值
                iconType: 1, // 设置默认 iconType
              } as any)
            : null
        }
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
  // 顶部玩家HUD
  playersHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  playerHUDCard: {
    flex: 1,
  },
  playerHUDContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 16,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHUDInfo: {
    flex: 1,
    gap: 4,
  },
  playerHUDName: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerHUDScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  miniProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // 中央转盘区域
  wheelCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  // 底部操作区
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  statusIndicator: {
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  roundBadge: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  floatingSpinButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingSpinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  floatingSpinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
})
