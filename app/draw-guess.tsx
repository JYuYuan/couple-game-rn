import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { usePageBase } from '@/hooks/usePageBase'
import { spacing } from '@/constants/commonStyles'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { GuessInput } from '@/components/GuessInput'
import VictoryModal from '@/components/VictoryModal'
import { DrawGuessTaskModal, DrawGuessTaskData } from '@/components/DrawGuessTaskModal'
import { PhaseTransitionModal } from '@/components/PhaseTransitionModal'
import { useGameTasks } from '@/hooks/use-game-tasks'
import { useDrawGuessGame, WORD_CATEGORIES, WordDifficulty } from '@/hooks/use-draw-guess-game'

const { width: screenWidth } = Dimensions.get('window')

export default function DrawGuess() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { t, colors } = usePageBase()

  // 获取传入的任务集ID
  const taskSetId = params.taskSetId as string
  const gameTasks = useGameTasks(taskSetId)

  const game = useDrawGuessGame()
  const [timer, setTimer] = useState(0)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [showRoundTransition, setShowRoundTransition] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<DrawGuessTaskData | null>(null)
  const [showPhaseTransition, setShowPhaseTransition] = useState(false)

  // 计时器 - 只在猜词阶段计时
  useEffect(() => {
    let interval: number

    if (
      game.isGameActive &&
      game.currentRound &&
      !game.currentRound.isCompleted &&
      game.currentRound.phase === 'guessing'
    ) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev + 1
          const currentRound = game.currentRound

          // 检查是否超时
          if (currentRound && newTime >= currentRound.timeLimit) {
            game.skipRound(newTime)
            setTimer(0)
            return 0
          }

          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [game.isGameActive, game.currentRound, game.currentRound?.phase])

  // 监听轮次完成 - 处理任务
  useEffect(() => {
    if (game.currentRound?.isCompleted && game.currentRound?.hasTask) {
      setTimer(0)

      // 显示任务弹窗
      const task = gameTasks.getRandomTask()
      if (task && game.currentRound.taskExecutor) {
        const taskData: DrawGuessTaskData = {
          id: task.id,
          title: task.title,
          description: task.description,
          playerName: game.currentRound.taskExecutor.name,
          playerColor: game.currentRound.taskExecutor.color,
          playerAvatar: game.currentRound.taskExecutor.avatarId,
          difficulty: task.difficulty,
        }

        setTaskModalData(taskData)
        setShowTaskModal(true)
      } else {
        // 没有任务时直接检查游戏结束
        game.completeTask()
      }
    }
  }, [game.currentRound?.isCompleted, game.currentRound?.hasTask])

  // 监听轮次完成 - 显示过渡
  useEffect(() => {
    if (game.currentRound?.isCompleted && !game.currentRound?.hasTask && !game.isGameEnded) {
      setShowRoundTransition(true)
      setTimeout(() => {
        setShowRoundTransition(false)
      }, 2000)
    }
  }, [game.currentRound?.isCompleted, game.isGameEnded])

  // 监听游戏结束
  useEffect(() => {
    if (game.isGameEnded) {
      setTimeout(() => {
        setShowVictoryModal(true)
      }, 500)
    }
  }, [game.isGameEnded])

  // 处理任务完成
  const handleTaskComplete = (_completed: boolean) => {
    setShowTaskModal(false)
    setTaskModalData(null)

    // 任务完成后检查游戏是否结束
    game.completeTask()
  }

  // 处理画画确认
  const handleConfirmDrawing = () => {
    setShowPhaseTransition(true) // 显示切换弹窗
  }

  // 确认切换到猜词阶段
  const handlePhaseTransitionConfirm = () => {
    setShowPhaseTransition(false)
    game.confirmDrawing()
    setTimer(0) // 重置计时器,准备开始猜词阶段的计时
  }

  // 处理猜对
  const handleGuessCorrect = () => {
    if (!game.currentRound || game.currentRound.phase !== 'guessing') return
    game.completeRound(timer)
  }

  // 处理跳过
  const handleSkip = () => {
    if (!game.currentRound || game.currentRound.phase !== 'guessing') return
    game.skipRound(timer)
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 获取剩余时间百分比
  const getTimeProgress = () => {
    if (!game.currentRound) return 100
    return ((game.currentRound.timeLimit - timer) / game.currentRound.timeLimit) * 100
  }

  // 获取时间颜色
  const getTimeColor = () => {
    const progress = getTimeProgress()
    if (progress > 50) return colors.success
    if (progress > 20) return colors.warning
    return colors.error
  }

  const canvasWidth = screenWidth - spacing.lg * 2
  const canvasHeight = canvasWidth * 0.75

  return (
    <>
      <Stack.Screen
        options={{
          title: `${gameTasks.selectedTaskSet?.name || ''}-${t('drawGuess.title', '你画我猜')}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('common.back', '返回'),
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

        {game.isGameWaiting ? (
          /* 难度选择界面 */
          <ScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.welcomeSection}>
              <View style={styles.iconWrapper}>
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="brush" size={60} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={[styles.welcomeTitle, { color: colors.homeCardTitle }]}>你画我猜</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.homeCardDescription }]}>
                发挥创意,画出你的想象
              </Text>

              {/* 玩家信息 */}
              <View style={styles.playersPreview}>
                {game.players.map((player) => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerPreviewCard,
                      { backgroundColor: colors.homeCardBackground + 'CC' },
                    ]}
                  >
                    <PlayerAvatar avatarId={player.avatarId} color={player.color} size={48} />
                    <Text style={[styles.playerPreviewName, { color: colors.homeCardTitle }]}>
                      {player.name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 难度选择 */}
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyTitle, { color: colors.homeCardTitle }]}>
                  选择难度
                </Text>

                <View style={styles.difficultyCards}>
                  {(Object.keys(WORD_CATEGORIES) as WordDifficulty[]).map((diff) => {
                    const config = WORD_CATEGORIES[diff]
                    const isSelected = game.difficulty === diff

                    return (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.difficultyCard,
                          {
                            backgroundColor: isSelected
                              ? '#F59E0B' + '20'
                              : colors.homeCardBackground + 'CC',
                            borderColor: isSelected ? '#F59E0B' : 'transparent',
                          },
                        ]}
                        onPress={() => game.setGameDifficulty(diff)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.difficultyName,
                            { color: isSelected ? '#F59E0B' : colors.homeCardTitle },
                          ]}
                        >
                          {config.name}
                        </Text>
                        <Text
                          style={[
                            styles.difficultyTime,
                            { color: isSelected ? '#F59E0B' : colors.homeCardDescription },
                          ]}
                        >
                          ⏱️ {config.timeLimit}秒
                        </Text>
                        <Text
                          style={[
                            styles.difficultyPoints,
                            { color: isSelected ? '#F59E0B' : colors.homeCardDescription },
                          ]}
                        >
                          🏆 {config.basePoints}分
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* 开始按钮 */}
              <TouchableOpacity
                style={[styles.startButton]}
                onPress={game.startGame}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F59E0B', '#FBBF24']}
                  style={styles.startButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>开始游戏</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* 游戏界面 */
          <View style={styles.gameContainer}>
            {/* 顶部玩家HUD */}
            <View style={styles.playersHUD}>
              {game.players.map((player) => {
                const isDrawer = game.currentRound?.drawer.id === player.id
                const isGuesser = game.currentRound?.guesser.id === player.id

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.playerHUDCard,
                      {
                        backgroundColor: colors.homeCardBackground + 'CC',
                        borderColor: isDrawer || isGuesser ? player.color : 'transparent',
                        borderWidth: isDrawer || isGuesser ? 3 : 0,
                      },
                    ]}
                  >
                    <View style={styles.playerHUDContent}>
                      <PlayerAvatar avatarId={player.avatarId} color={player.color} size={40} />
                      <View style={styles.playerHUDInfo}>
                        <View style={styles.playerHUDNameRow}>
                          <Text style={[styles.playerHUDName, { color: colors.homeCardTitle }]}>
                            {player.name}
                          </Text>
                          {isDrawer && (
                            <View
                              style={[styles.roleTag, { backgroundColor: player.color + '30' }]}
                            >
                              <Text style={[styles.roleTagText, { color: player.color }]}>
                                🖌️ 画
                              </Text>
                            </View>
                          )}
                          {isGuesser && (
                            <View
                              style={[styles.roleTag, { backgroundColor: player.color + '30' }]}
                            >
                              <Text style={[styles.roleTagText, { color: player.color }]}>
                                🤔 猜
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.playerHUDScore, { color: player.color }]}>
                          🏆 {player.score}分
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>

            {/* 中央游戏区 */}
            <ScrollView
              style={styles.gameScrollContainer}
              contentContainerStyle={styles.gameScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 回合信息和计时器 */}
              <View
                style={[
                  styles.roundInfoCard,
                  { backgroundColor: colors.homeCardBackground + 'E6' },
                ]}
              >
                <View style={styles.roundInfoTop}>
                  <Text style={[styles.roundNumber, { color: colors.homeCardDescription }]}>
                    第 {game.currentRoundIndex + 1}/{game.totalRounds} 回合
                  </Text>

                  <View style={styles.timerContainer}>
                    <Ionicons name="time-outline" size={20} color={getTimeColor()} />
                    <Text style={[styles.timerText, { color: getTimeColor() }]}>
                      {formatTime(
                        game.currentRound
                          ? game.currentRound.timeLimit - timer
                          : WORD_CATEGORIES[game.difficulty].timeLimit,
                      )}
                    </Text>
                  </View>
                </View>

                {/* 时间进度条 */}
                <View style={[styles.timeProgressBar, { backgroundColor: colors.homeCardBorder }]}>
                  <View
                    style={[
                      styles.timeProgressFill,
                      {
                        width: `${getTimeProgress()}%`,
                        backgroundColor: getTimeColor(),
                      },
                    ]}
                  />
                </View>

                {/* 题目提示 */}
                {game.currentRound && (
                  <View style={styles.wordHintContainer}>
                    <Text style={[styles.wordHintLabel, { color: colors.homeCardDescription }]}>
                      {game.currentRound.phase === 'drawing' ? '你要画的是:' : `猜一猜画的是什么:`}
                    </Text>
                    {game.currentRound.phase === 'drawing' ? (
                      <Text style={[styles.wordHintText, { color: '#F59E0B' }]}>
                        {game.currentRound.word}
                      </Text>
                    ) : (
                      <Text style={[styles.wordHintText, { color: colors.homeCardDescription }]}>
                        {'?'.repeat(game.currentRound.word.length)}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* 画布 */}
              <DrawingCanvas
                width={canvasWidth}
                height={canvasHeight}
                colors={colors}
                disabled={game.currentRound?.phase !== 'drawing'}
              />

              {/* 画画阶段 - 确认按钮 */}
              {game.currentRound && game.currentRound.phase === 'drawing' && (
                <TouchableOpacity
                  style={[styles.confirmDrawingButton]}
                  onPress={handleConfirmDrawing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.confirmButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>确认画完</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* 猜词输入框 - 只在猜词阶段显示 */}
              {game.currentRound && game.currentRound.phase === 'guessing' && (
                <View style={styles.guessSection}>
                  <GuessInput
                    correctWord={game.currentRound.word}
                    onGuessCorrect={handleGuessCorrect}
                    colors={colors}
                    placeholder="输入你的猜测..."
                    disabled={game.currentRound.isCompleted}
                  />
                </View>
              )}

              {/* 跳过按钮 - 只在猜词阶段显示 */}
              {game.currentRound && game.currentRound.phase === 'guessing' && (
                <TouchableOpacity
                  style={[styles.skipButton, { backgroundColor: colors.warning }]}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                  disabled={game.currentRound?.isCompleted}
                >
                  <Ionicons name="play-skip-forward" size={20} color="#FFFFFF" />
                  <Text style={styles.skipButtonText}>跳过这一轮</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* 轮次过渡提示 */}
      <Modal visible={showRoundTransition} transparent animationType="fade">
        <View style={styles.transitionOverlay}>
          <View
            style={[styles.transitionCard, { backgroundColor: colors.homeCardBackground + 'F2' }]}
          >
            {game.currentRound?.guessedCorrectly ? (
              <>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
                <Text style={[styles.transitionTitle, { color: colors.success }]}>猜对了!</Text>
                <Text style={[styles.transitionPoints, { color: colors.homeCardTitle }]}>
                  +{game.currentRound.pointsAwarded}分
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={80} color={colors.error} />
                <Text style={[styles.transitionTitle, { color: colors.error }]}>时间到!</Text>
                <Text style={[styles.transitionWord, { color: colors.homeCardDescription }]}>
                  答案是: {game.rounds[game.currentRoundIndex]?.word || ''}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 阶段切换弹窗 - 画画完成切换到猜词 */}
      {game.currentRound && (
        <PhaseTransitionModal
          visible={showPhaseTransition}
          phase="toGuessing"
          drawerName={game.currentRound.drawer.name}
          guesserName={game.currentRound.guesser.name}
          onConfirm={handlePhaseTransitionConfirm}
          colors={colors}
        />
      )}

      {/* 任务弹窗 */}
      <DrawGuessTaskModal
        visible={showTaskModal}
        task={taskModalData}
        onComplete={handleTaskComplete}
        onClose={() => setShowTaskModal(false)}
        colors={colors}
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={
          game.getWinner()
            ? ({
                ...game.getWinner()!,
                position: 0,
                iconType: 1,
              } as any)
            : null
        }
        isWinner={true}
        onRestart={() => {
          setShowVictoryModal(false)
          game.resetGame()
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
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  // 欢迎界面
  welcomeSection: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconGradient: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  playersPreview: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  playerPreviewCard: {
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerPreviewName: {
    fontSize: 14,
    fontWeight: '600',
  },
  difficultySection: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  difficultyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  difficultyCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  difficultyCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  difficultyName: {
    fontSize: 18,
    fontWeight: '700',
  },
  difficultyTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  difficultyPoints: {
    fontSize: 13,
    fontWeight: '600',
  },
  startButton: {
    marginTop: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    gap: spacing.sm,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  // 游戏界面
  gameContainer: {
    flex: 1,
  },
  playersHUD: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  playerHUDCard: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHUDContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerHUDInfo: {
    flex: 1,
    gap: 4,
  },
  playerHUDNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerHUDName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playerHUDScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  gameScrollContainer: {
    flex: 1,
  },
  gameScrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  roundInfoCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roundInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  wordHintContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordHintLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  wordHintText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
  },
  guessSection: {
    width: '100%',
  },
  confirmDrawingButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 过渡动画
  transitionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionCard: {
    padding: spacing.xl * 2,
    borderRadius: 24,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  transitionTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  transitionPoints: {
    fontSize: 24,
    fontWeight: '700',
  },
  transitionWord: {
    fontSize: 18,
    fontWeight: '600',
  },
})
