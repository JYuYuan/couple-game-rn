import React, { useMemo, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import GameBoard from '@/components/GameBoard'
import TaskModal, { TaskModalData } from '@/components/TaskModal'
import VictoryModal from '@/components/VictoryModal'
import { RoomWaiting } from '@/components/RoomWaiting'
import { GamePlayer } from '@/hooks/use-game-players'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { useOnlineFlyGame } from '@/hooks/use-online-fly-game'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer } from '@/types/online'
import LoadingScreen from '@/components/LoadingScreen'
import { PlayerIcon } from '@/components/icons'

export default function FlyingChessGame() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  // 获取传入的参数
  const roomId = params.roomId as string

  const onlineGameHook = useOnlineFlyGame()

  const audioManager = useAudioManager()

  const taskSet = useMemo(() => {
    return onlineGameHook.taskSet
  }, [onlineGameHook.taskSet])

  const room = useMemo(() => {
    return onlineGameHook.room
  }, [onlineGameHook.room])

  const players = useMemo(() => {
    return onlineGameHook.players
  }, [onlineGameHook.players])

  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)

  const boardPath = useMemo(() => {
    return onlineGameHook.boardPath
  }, [onlineGameHook.boardPath])

  // 动画值
  const diceRotation = useSharedValue(0)

  // 处理胜利显示
  const showVictory = (victoryPlayer: GamePlayer) => {
    console.log('🏆 显示胜利界面:', victoryPlayer.name)

    audioManager.playSoundEffect('victory')
    setWinner(victoryPlayer)
    setShowVictoryModal(true)
  }

  // 用于动画的本地玩家状态
  const [animatedPlayers, setAnimatedPlayers] = useState<OnlinePlayer[]>([])

  // 任务完成反馈 - 只发送结果给服务端
  const handleTaskComplete = (completed: boolean) => {
    if (!taskModalData) return

    console.log(`📋 任务完成反馈: ${completed ? '成功' : '失败'}`)

    // 播放音效
    audioManager.playSoundEffect(completed ? 'victory' : 'step')

    // 发送结果给服务端，服务端处理所有逻辑
    onlineGameHook.socket.completeTask({
      roomId: onlineGameHook.room?.id,
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
    if (isRolling || isMoving || !onlineGameHook.isOwnTurn) {
      console.warn('不能投掷骰子: 状态不允许')
      return
    }

    console.log('🎲 请求投掷骰子')
    setIsRolling(true)

    try {
      // 只发送投骰子请求给服务端，由服务端生成结果
      onlineGameHook.socket.rollDice({
        roomId: onlineGameHook.room?.id,
        playerId: onlineGameHook.currentPlayer?.id,
      })

      // 等待服务端响应
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('投掷骰子请求失败:', error)
      audioManager.playSoundEffect('step')
    } finally {
      setIsRolling(false)
    }
  }

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  useEffect(() => {
    if (!onlineGameHook.socket) return

    // 监听骰子结果
    const handleDiceRolled = (data: any) => {
      console.log('🎲 收到骰子结果:', data.diceValue)

      // 如果是当前玩家的回合，显示骰子动画
      if (data.playerId === onlineGameHook.currentPlayer?.id) {
        // 骰子旋转动画
        diceRotation.value = withTiming(360 * 4, { duration: 1200 })
        // 播放音效
        audioManager.playSoundEffect('dice')
        // 重置滚动状态
        setIsRolling(false)
      }
    }

    // 监听玩家移动指令
    const handlePlayerMove = (data: any) => {
      console.log(
        `🚶 收到移动指令: 玩家 ${data.playerId} 从 ${data.fromPosition} 移动到 ${data.toPosition}`,
      )

      setIsMoving(true)

      // 调用逐步移动动画
      movePlayerStepByStep(data.playerId, data.fromPosition, data.toPosition, () => {
        // 动画结束后，将权威状态同步到动画状态
        setAnimatedPlayers(onlineGameHook.players as OnlinePlayer[])
        setIsMoving(false)
        console.log(`✅ 玩家 ${data.playerId} 移动动画完成`)
      })
    }

    // 监听任务触发
    const handleTaskTrigger = (data: any) => {
      console.log(`🎯 收到任务触发:`, data)

      // 查找执行者信息
      const executorPlayers = onlineGameHook.players.filter((p) =>
        data.executorPlayerIds.includes(p.id),
      )

      // 显示任务弹窗
      setTaskModalData({
        id: data.task.id,
        type: data.taskType,
        title: data.task.title,
        description: data.task.description,
        category: data.task.category,
        difficulty: data.task.difficulty,
        triggerPlayerIds: data.triggerPlayerIds,
        executors: executorPlayers, // 转换ID类型
      })
      setShowTaskModal(true)
    }

    // 监听游戏胜利
    const handleGameVictory = (data: { winnerId: string }) => {
      console.log(`🏆 游戏胜利: 玩家 ${data.winnerId} 获胜`)

      // 显示胜利弹窗
      const winnerPlayer = onlineGameHook.players.find((p) => p.id === data.winnerId)
      if (winnerPlayer) {
        // 转换为GamePlayer类型
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

    // 监听游戏状态更新
    const handleGameStateUpdate = (data: any) => {
      console.log('🔄 游戏状态更新:', data)
      // 这里可以处理其他游戏状态更新，比如当前玩家切换等
    }

    // 注册事件监听器
    const socket = onlineGameHook.socket

    socket.on('game:dice-roll', handleDiceRolled)
    socket.on('game:player-move', handlePlayerMove)
    socket.on('game:task-trigger', handleTaskTrigger)
    socket.on('game:victory', handleGameVictory)
    socket.on('game:state', handleGameStateUpdate)

    // 清理函数
    return () => {
      if (socket) {
        socket.off('game:dice-roll', handleDiceRolled)
        socket.off('game:player-move', handlePlayerMove)
        socket.off('game:task-trigger', handleTaskTrigger)
        socket.off('game:victory', handleGameVictory)
        socket.off('game:state', handleGameStateUpdate)
      }
    }
  }, [onlineGameHook.socket.isConnected, onlineGameHook.currentPlayer, onlineGameHook.players])

  // 同步动画玩家状态与服务器状态
  useEffect(() => {
    // 仅在没有动画进行时同步，防止中断正在进行的移动动画
    if (!isMoving) {
      setAnimatedPlayers(onlineGameHook.players as OnlinePlayer[])
    }
  }, [onlineGameHook.players, isMoving])

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

      setTimeout(moveOneStep, 300) // 每一步的动画间隔
    }

    moveOneStep()
  }

  if (!room) return <LoadingScreen />

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

      {/* 根据模式渲染不同内容 */}
      {
        // 在线模式：等待玩家 或 游戏界面
        onlineGameHook.isWaitingForPlayers ? (
          <RoomWaiting
            isHost={onlineGameHook.isHost}
            maxPlayers={onlineGameHook.room?.maxPlayers || 2}
            roomId={onlineGameHook.room?.id || roomId || 'UNKNOWN'}
            players={onlineGameHook.players as OnlinePlayer[]}
            onStartGame={() => onlineGameHook.socket.startGame({ roomId: onlineGameHook.room?.id })}
            onLeaveRoom={() => {
              onlineGameHook.socket.emit('room:leave')
              router.back()
            }}
          />
        ) : (
          // 使用统一的游戏界面
          <GameContent />
        )
      }
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
              {room?.gameStatus === 'playing' && onlineGameHook?.currentPlayer && (
                <Text
                  style={[styles.currentPlayerText, { color: onlineGameHook.currentPlayer.color }]}
                >
                  {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: onlineGameHook.currentPlayer.name,
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
                          isRolling || isMoving || !onlineGameHook.isOwnTurn
                            ? '#FF6B6B'
                            : colors.settingsAccent,
                        borderWidth: 3,
                        borderColor: 'white',
                        opacity: isRolling || isMoving || !onlineGameHook.isOwnTurn ? 0.6 : 1,
                      },
                    ]}
                    onPress={rollDice}
                    disabled={isRolling || isMoving || !onlineGameHook.isOwnTurn}
                    activeOpacity={0.8}
                  >
                    {isRolling ? (
                      <Animated.View style={diceAnimatedStyle}>
                        <Text style={styles.diceEmoji}>🎲</Text>
                      </Animated.View>
                    ) : (
                      <Text style={[styles.diceResultText, { color: 'white' }]}>
                        {onlineGameHook.diceValue || '🎲'}
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
                  {!onlineGameHook.isOwnTurn
                    ? t('flyingChess.dice.waitingTurn', '等待其他玩家')
                    : isRolling
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
              {animatedPlayers.map((player) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: player.color + '15',
                      borderColor:
                        onlineGameHook.currentPlayer?.id === player.id
                          ? player.color
                          : 'transparent',
                      borderWidth: onlineGameHook.currentPlayer?.id === player.id ? 2 : 0,
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
              players={animatedPlayers.map((p) => ({ ...p, id: parseInt(p.id) }))} // 转换ID类型为number
              currentPlayer={onlineGameHook.currentPlayerIndex || 0}
              boardData={boardPath}
              onCellPress={(_cell) => {
                // TODO: 处理点击棋盘格子的逻辑
              }}
            />
          </View>
        </ScrollView>

        {/* 任务弹窗 */}
        <TaskModal
          players={players}
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
})
