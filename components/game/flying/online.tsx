import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import GameBoard from '@/components/GameBoard'
import TaskModal from '@/components/TaskModal'
import VictoryModal from '@/components/VictoryModal'
import { GamePlayer } from '@/hooks/use-game-players'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer, TaskModalData } from '@/types/online'
import { PlayerIcon } from '@/components/icons'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore, useSettingsStore } from '@/store'
import { useDeepCompareEffect } from 'ahooks'

export default function FlyingChessGame() {
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()
  const { playerId } = useSettingsStore()
  const socket = useSocket()

  // 使用 roomStore 管理状态，避免空值问题
  const { currentRoom: room } = useRoomStore()
  // 从房间获取数据，提供默认值
  const players = room?.players || []
  const boardPath = room?.boardPath || []
  const taskSet = room?.taskSet
  const currentUserId = room?.currentUser

  const isOwnTurn = useMemo(() => {
    return currentUserId === playerId
  }, [currentUserId])

  const isHost = useMemo(() => {
    return room?.hostId === playerId
  }, [room?.hostId])

  const currentPlayer = useMemo(() => {
    return players?.find((item) => currentUserId === item.id) || null
  }, [players, currentUserId])

  const currentPlayerIndex = useMemo(() => {
    return players?.findIndex((item) => currentUserId === item.id) ?? -1
  }, [players, currentUserId])

  const audioManager = useAudioManager()

  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)

  useEffect(() => {
    if (room?.gameStatus === 'waiting') {
      router.replace({
        pathname: '/waiting-room',
        params: {
          taskSetId: taskSet?.id || '',
          onlineMode: 'true',
          roomId: room?.id || '',
        },
      })
    }
  }, [room?.gameStatus])

  // 动画值
  const diceRotation = useSharedValue(0)

  // 处理胜利显示
  const showVictory = (victoryPlayer: GamePlayer) => {
    console.log('🏆 显示胜利界面:', victoryPlayer.name)
    setWinner(victoryPlayer)
    setShowVictoryModal(true)
  }

  // 用于动画的本地玩家状态
  const [animatedPlayers, setAnimatedPlayers] = useState<OnlinePlayer[]>([])

  // 本地骰子状态 - 通过 game:dice 事件更新
  const [currentDiceValue, setCurrentDiceValue] = useState<number | null>(null)

  // 重新开始游戏
  const handleRestartGame = () => {
    console.log('🔄 请求重新开始游戏')
    // 发送重新开始请求给服务端
    socket.emit('game:start', { roomId: room?.id })
  }

  // 任务完成反馈 - 只发送结果给服务端
  const handleTaskComplete = (completed: boolean) => {
    if (!taskModalData) return

    console.log(`📋 任务完成反馈: ${completed ? '成功' : '失败'}`)

    // 播放音效
    audioManager.playSoundEffect(completed ? 'victory' : 'step')

    // 发送结果给服务端，服务端处理所有逻辑
    socket.completeTask({
      roomId: room?.id,
      taskId: taskModalData.id,
      playerId: taskModalData.executors[0]?.id.toString() || '',
      completed,
    })

    // 关闭弹窗
    setShowTaskModal(false)
    setTaskModalData(null)
  }

  // 投骰子 - 只发送请求，不处理逻辑
  const rollDice = async () => {
    if (isRolling || isMoving || !isOwnTurn) {
      console.warn('不能投掷骰子: 状态不允许')
      return
    }

    console.log('🎲 请求投掷骰子')
    setIsRolling(true)

    // 立即开始骰子旋转动画，提供即时反馈
    diceRotation.value = withTiming(360 * 4, { duration: 1200 })

    try {
      // 只发送投骰子请求给服务端，由服务端生成结果
      console.log('🎲 发送投骰子请求到服务端')
      socket.rollDice({
        roomId: room?.id,
        playerId: currentPlayer?.id,
      })

      // 等待服务端响应
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('投掷骰子请求失败:', error)
      audioManager.playSoundEffect('step')
      // 如果请求失败，重置骰子动画
      diceRotation.value = withTiming(0, { duration: 200 })
      setIsRolling(false) // 在错误情况下重置状态
    } finally {
      // 注意：isRolling 的重置现在由 game:dice 事件处理
      // setIsRolling(false) 将在接收到服务端响应时执行
    }
  }

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  // 监听游戏事件 - 独立的事件监听，不依赖room状态
  useDeepCompareEffect(() => {
    if (!socket.isConnected) {
      console.log('❌ Socket 未连接，跳过事件监听器注册')
      return
    }

    console.log('✅ 注册游戏事件监听器')
    // 监听骰子事件
    const handleDiceRoll = (data: { playerId: string; diceValue: number; timestamp: number }) => {
      console.log('🎲 收到骰子事件:', data)

      // 更新本地骰子状态
      setCurrentDiceValue(data.diceValue)

      // 动态获取当前玩家ID，避免依赖闭包
      const currentPlayerId = currentPlayer?.id
      if (data.playerId === currentPlayerId) {
        // 播放音效（动画已在点击时开始）
        audioManager.playSoundEffect('dice')
        // 重置滚动状态
        setIsRolling(false)
      }
    }

    // 监听任务事件
    const handleTaskTrigger = (data: {
      task: any
      taskType: string
      executorPlayerIds: string[]
      triggerPlayerIds: string[]
    }) => {
      console.log('🎯 收到任务事件:', data)

      // 查找执行者信息
      const executorPlayers = players?.filter((p) => data.executorPlayerIds.includes(p.id)) || []

      // 显示任务弹窗
      setTaskModalData({
        id: data.task.id,
        type: data.taskType as 'trap' | 'star' | 'collision',
        title: data.task.title,
        description: data.task.description,
        category: data.task.category,
        difficulty: data.task.difficulty,
        triggerPlayerIds: data.triggerPlayerIds.map((id) => parseInt(id)),
        executors: executorPlayers,
      })
      setShowTaskModal(true)
    }

    // 监听胜利事件
    const handleGameVictory = (data: { winnerId: string; winnerName: string }) => {
      console.log('🏆 收到胜利事件:', data)

      const winnerPlayer = players?.find((p) => p.id === data.winnerId)
      if (winnerPlayer) {
        const gameWinner = {
          id: parseInt(winnerPlayer.id),
          name: winnerPlayer.name,
          color: winnerPlayer.color,
          position: winnerPlayer.position,
          iconType: winnerPlayer.iconType,
        } as GamePlayer
        showVictory(gameWinner)
      }
    }

    // 监听玩家移动事件
    const handlePlayerMove = (data: {
      playerId: string
      fromPosition: number
      toPosition: number
    }) => {
      console.log('🚶 收到移动事件:', data)

      setIsMoving(true)
      movePlayerStepByStep(data.playerId, data.fromPosition, data.toPosition, () => {
        // 动画完成后确保玩家在最终位置
        setAnimatedPlayers((prevPlayers) =>
          prevPlayers.map((p) =>
            p.id === data.playerId ? { ...p, position: data.toPosition } : p,
          ),
        )
        socket.runActions('move_complete', { roomId: room?.id })
        setIsMoving(false)
        console.log(`✅ 玩家 ${data.playerId} 移动动画完成，最终位置: ${data.toPosition}`)
      })
    }

    // 监听用户切换事件
    const handleNextPlayer = (data: { currentUser: string; roomId: string }) => {
      console.log('🔄 收到用户切换事件:', data)

      // 动态获取当前玩家信息和用户ID
      const currentPlayerId = currentPlayer?.id
      const isMyTurn = data.currentUser === currentPlayerId

      // 查找切换到的玩家信息
      const nextPlayer = players?.find((p) => p.id === data.currentUser)

      if (isMyTurn) {
        console.log('✨ 轮到我了，可以投掷骰子')
        // 重置骰子状态，允许当前玩家投掷
        setCurrentDiceValue(null)
        setIsRolling(false)
        setIsMoving(false)

        // 播放提示音效
        audioManager.playSoundEffect('dice')
      } else {
        console.log(`⏳ 等待 ${nextPlayer?.name || '其他玩家'} 投掷骰子`)
        // 重置状态，防止非当前玩家操作
        setIsRolling(false)
        setIsMoving(false)
      }

      // 强制更新UI显示当前玩家状态
      // 这个事件确保UI能够立即反映玩家切换
    }

    // 注册事件监听器
    socket.on('game:dice', handleDiceRoll)
    socket.on('game:task', handleTaskTrigger)
    socket.on('game:victory', handleGameVictory)
    socket.on('game:move', handlePlayerMove)
    socket.on('game:next', handleNextPlayer)

    // 清理函数
    return () => {
      console.log('🧹 清理游戏事件监听器')
      socket.off('game:dice', handleDiceRoll)
      socket.off('game:task', handleTaskTrigger)
      socket.off('game:victory', handleGameVictory)
      socket.off('game:move', handlePlayerMove)
      socket.off('game:next', handleNextPlayer)
    }
  }, [socket.isConnected])

  // 监听房间状态变化 - 同步玩家位置
  useEffect(() => {
    if (!room || !players.length) return

    // 只在非移动状态时同步玩家位置
    if (!isMoving) {
      setAnimatedPlayers(players as OnlinePlayer[])
    }
  }, [players, isMoving, room])

  // 逐步移动玩家的动画函数
  const movePlayerStepByStep = (
    playerId: string,
    from: number,
    to: number,
    onComplete?: () => void,
  ) => {
    const steps = Math.abs(to - from)
    const isForward = to > from
    let currentStep = 0

    const moveOneStep = () => {
      if (currentStep >= steps) {
        // 动画结束
        onComplete?.()
        return
      }

      currentStep++
      const nextPosition = isForward ? from + currentStep : from - currentStep

      setAnimatedPlayers((prevPlayers) =>
        prevPlayers.map((p) => (p.id === playerId ? { ...p, position: nextPosition } : p)),
      )

      audioManager.playSoundEffect('step')

      setTimeout(moveOneStep, 1000) // 每一步的动画间隔
    }

    moveOneStep()
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${taskSet?.name || ''}-${t('flyingChess.title', '飞行棋')}(${t('online.mode', '在线模式')})`,
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

      <GameContent />
    </>
  )

  // 统一的游戏内容组件
  function GameContent() {
    return (
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
                {room?.gameStatus === 'waiting'
                  ? t('flyingChess.gameStatus.waiting', '准备开始')
                  : room?.gameStatus === 'playing'
                    ? t('flyingChess.gameStatus.playing', '游戏进行中')
                    : t('flyingChess.gameStatus.finished', '游戏结束')}
              </Text>
              {room?.gameStatus === 'playing' && currentPlayer && (
                <Text style={[styles.currentPlayerText, { color: currentPlayer.color }]}>
                  {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: currentPlayer.name,
                  })}
                </Text>
              )}
            </View>

            {room?.gameStatus === 'playing' && (
              <View style={styles.diceContainer}>
                <View style={styles.diceWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.diceButton,
                      {
                        backgroundColor:
                          isRolling || isMoving || !isOwnTurn ? '#FF6B6B' : colors.settingsAccent,
                        borderWidth: 3,
                        borderColor: 'white',
                        opacity: isRolling || isMoving || !isOwnTurn ? 0.6 : 1,
                      },
                    ]}
                    onPress={rollDice}
                    disabled={isRolling || isMoving || !isOwnTurn}
                    activeOpacity={0.8}
                  >
                    {isRolling ? (
                      <Animated.View style={diceAnimatedStyle}>
                        <Text style={styles.diceEmoji}>🎲</Text>
                      </Animated.View>
                    ) : (
                      <Text style={[styles.diceResultText, { color: 'white' }]}>
                        {currentDiceValue || '🎲'}
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
                  {!isOwnTurn
                    ? t('flyingChess.dice.waitingTurn', '等待其他玩家')
                    : isRolling
                      ? t('flyingChess.dice.rolling', '投掷中...')
                      : isMoving
                        ? t('flyingChess.dice.moving', '棋子移动中...')
                        : t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
                </Text>
              </View>
            )}
            {/* 重新开始按钮 - 游戏结束时显示，只有房主可以操作 */}
            {room?.gameStatus === 'ended' && isHost && (
              <TouchableOpacity
                style={[styles.restartButton, { backgroundColor: colors.settingsAccent }]}
                onPress={handleRestartGame}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="white" />
                <Text style={[styles.restartButtonText, { color: 'white' }]}>
                  {t('flyingChess.restart', '重新开始')}
                </Text>
              </TouchableOpacity>
            )}
            {/* 非房主显示等待重新开始的提示 */}
            {room?.gameStatus === 'ended' && !isHost && (
              <View style={[styles.waitingRestart, { backgroundColor: colors.homeCardBackground }]}>
                <Text style={[styles.waitingRestartText, { color: colors.homeCardDescription }]}>
                  {t('flyingChess.waitingRestart', '等待房主重新开始游戏')}
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
              {animatedPlayers.map((player) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: player.color + '15',
                      borderColor: currentPlayer?.id === player.id ? player.color : 'transparent',
                      borderWidth: currentPlayer?.id === player.id ? 2 : 0,
                    },
                  ]}
                >
                  <PlayerIcon see={player.iconType} />
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                        {player.name}
                      </Text>
                      {player?.isHost && <Ionicons name="star" size={14} color="#FFD700" />}
                    </View>
                    <Text style={[styles.playerPosition, { color: colors.homeCardDescription }]}>
                      {t('flyingChess.position', '位置: {{position}}', {
                        position: player.position + 1,
                      })}
                    </Text>
                    <View style={styles.connectionStatus}>
                      <View
                        style={[
                          styles.connectionDot,
                          {
                            backgroundColor: player?.isConnected ? '#4CAF50' : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={[styles.connectionText, { color: colors.homeCardDescription }]}>
                        {player?.isConnected
                          ? t('online.connected', '在线')
                          : t('online.disconnected', '离线')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 游戏棋盘 */}
          <View style={[styles.boardSection, { backgroundColor: colors.homeCardBackground }]}>
            <GameBoard
              players={animatedPlayers.map((p) => ({ ...p, id: p.id }))} // 转换ID类型为number
              currentPlayer={currentPlayerIndex >= 0 ? currentPlayerIndex : 0}
              boardData={boardPath}
            />
          </View>
        </ScrollView>

        {/* 任务弹窗 */}
        <TaskModal
          players={players || []}
          visible={showTaskModal}
          task={taskModalData}
          onComplete={handleTaskComplete}
          onClose={() => setShowTaskModal(false)}
        />

        {/* 胜利弹窗 */}
        <VictoryModal
          visible={showVictoryModal}
          winner={winner}
          availableTasks={[]}
          onTasksSelected={() => {}}
          onRestart={() => {
            // TODO: 实现重新开始逻辑，例如通知服务器
            setShowVictoryModal(false)
          }}
          onExit={() => {
            setShowVictoryModal(false)
            router.back()
          }}
          onClose={() => setShowVictoryModal(false)}
        />
      </View>
    )
  }
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
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 10,
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
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  restartButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  waitingRestart: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  waitingRestartText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
})
