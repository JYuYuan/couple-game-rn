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
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { RoomWaiting } from '@/components/RoomWaiting'
import { GamePlayer } from '@/hooks/use-game-players'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { useOnlineGame } from '@/hooks/use-online-game'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer, CellType } from '@/types/online'
import LoadingScreen from '@/components/LoadingScreen'

export default function FlyingChessGame() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  // 获取传入的参数
  const roomId = params.roomId as string

  const onlineGameHook = useOnlineGame()
  const audioManager = useAudioManager()

  // 游戏状态
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [pendingTaskType, setPendingTaskType] = useState<'trap' | 'star' | 'collision' | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)

  // 动画值
  const diceRotation = useSharedValue(0)
  const playerMoveAnim = useSharedValue(0)

  // 计算属性
  const taskSet = useMemo(() => onlineGameHook.taskSet, [onlineGameHook.taskSet])
  const room = useMemo(() => onlineGameHook.room, [onlineGameHook.room])
  const players = useMemo(() => onlineGameHook.players, [onlineGameHook.players])
  const boardPath = useMemo(() => onlineGameHook.boardPath, [onlineGameHook.boardPath])
  const currentPlayer = useMemo(() => onlineGameHook.currentPlayer, [onlineGameHook.currentPlayer])
  const isMyTurn = useMemo(() => currentPlayer?.id === room?.currentUser, [currentPlayer, room])

  // 监听Socket事件同步游戏状态
  useEffect(() => {
    if (!onlineGameHook.socket || !room) return

    const socket = onlineGameHook.socket

    // 监听骰子结果
    socket.on('game:diceResult', (data) => {
      if (data.roomId === room.id) {
        setIsRolling(false)
        if (data.playerId === room.currentUser) {
          handlePlayerMove(data.diceValue)
        }
      }
    })

    // 监听玩家移动
    socket.on('game:playerMoved', (data) => {
      if (data.roomId === room.id) {
        const movedPlayer = players.find(p => p.id === data.playerId)
        if (movedPlayer) {
          checkCellAndTriggerTask(data.playerId, data.newPosition)
        }
        if (data.playerId === room.currentUser) {
          setIsMoving(false)
        }
      }
    })

    // 监听任务完成
    socket.on('game:taskCompleted', (data) => {
      if (data.roomId === room.id && data.playerId === room.currentUser) {
        setShowTaskModal(false)
        setPendingTaskType(null)
        setTaskModalData(null)
      }
    })

    // 监听游戏胜利
    socket.on('game:victory', (data) => {
      if (data.roomId === room.id) {
        const victoryPlayer = players.find(p => p.id === data.playerId)
        if (victoryPlayer) {
          handleVictory(victoryPlayer)
        }
      }
    })

    // 监听玩家离开
    socket.on('room:playerLeft', () => {
      if (players.length <= 1) {
        router.back()
      }
    })

    return () => {
      socket.off('game:diceResult')
      socket.off('game:playerMoved')
      socket.off('game:taskCompleted')
      socket.off('game:victory')
      socket.off('room:playerLeft')
    }
  }, [onlineGameHook.socket, room, players])

  // 处理胜利
  const handleVictory = async (victoryPlayer: GamePlayer) => {
    setWinner(victoryPlayer)
    setShowVictoryModal(true)
    await audioManager.playSound('victory')
  }

  // 检查格子类型并触发任务
  const checkCellAndTriggerTask = (playerId: string, position: number) => {
    if (!boardPath || position >= boardPath.length) return

    const cell = boardPath[position] as CellType
    if (!cell?.type || cell.type === 'normal') return

    // 只有当前回合的玩家才触发任务
    if (playerId === room?.currentUser) {
      triggerTask(cell.type as 'trap' | 'star' | 'collision', playerId)
    }
  }

  // 触发任务弹窗
  const triggerTask = (taskType: 'trap' | 'star' | 'collision', triggerPlayerId: string) => {
    if (!taskSet?.tasks) return

    const task = taskSet.tasks.find(t => t.type === taskType)
    if (!task) return

    setPendingTaskType(taskType)
    setTaskModalData({
      title: task.title,
      description: task.description,
      reward: task.reward,
      penalty: task.penalty
    })
    setShowTaskModal(true)
    audioManager.playSound('task')
  }

  // 处理任务完成结果
  const handleTaskComplete = async (completed: boolean) => {
    if (!pendingTaskType || !currentPlayer || !taskModalData || !room) return

    setIsMoving(true)
    const steps = completed ? (taskModalData.reward || 0) : (taskModalData.penalty || 0)
    
    await movePlayerByTaskReward(
      currentPlayer.id,
      steps,
      completed,
      (playerId, finalPosition) => {
        onlineGameHook.socket.emit('game:submitTaskResult', {
          roomId: room.id,
          playerId,
          newPosition: finalPosition,
          taskType: pendingTaskType,
          completed
        })
      }
    )

    setIsMoving(false)
    setShowTaskModal(false)
    setPendingTaskType(null)
    setTaskModalData(null)
  }

  // 任务完成后的回调处理
  const handleTaskCompleteCallback = (playerId: string, finalPosition: number) => {
    if (finalPosition >= (boardPath.length - 1)) {
      const winningPlayer = players.find(p => p.id === playerId)
      if (winningPlayer) {
        onlineGameHook.socket.emit('game:declareVictory', {
          roomId: room?.id,
          playerId
        })
      }
    } else {
      // 通知服务器当前玩家回合结束
      onlineGameHook.socket.emit('game:endTurn', {
        roomId: room?.id,
        playerId
      })
    }
  }

  // 掷骰子
  const rollDice = async () => {
    if (!isMyTurn || isRolling || isMoving || !room) return

    setIsRolling(true)
    await audioManager.playSound('dice')
    
    // 骰子旋转动画
    diceRotation.value = 0
    for (let i = 0; i < 15; i++) {
      diceRotation.value = withTiming(diceRotation.value + 72, { duration: 100 })
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 发送掷骰子请求
    onlineGameHook.socket.emit('game:rollDice', {
      roomId: room.id,
      playerId: currentPlayer.id
    })
  }

  // 玩家移动处理函数
  const handlePlayerMove = async (steps: number) => {
    if (!currentPlayer || !room || steps <= 0 || isMoving) return

    setIsMoving(true)
    await audioManager.playSound('move')
    
    const playerIndex = players.findIndex(p => p.id === currentPlayer.id)
    const currentPosition = currentPlayer.position
    const newPosition = Math.min(currentPosition + steps, boardPath.length - 1)
    
    // 执行移动动画
    await movePlayerStepByStep(
      playerIndex,
      steps,
      (playerId, finalPosition) => {
        // 通知服务器移动结果
        onlineGameHook.socket.emit('game:confirmMove', {
          roomId: room.id,
          playerId,
          newPosition: finalPosition
        })
      }
    )
  }

  // 重置游戏
  const handleResetGame = async () => {
    if (!room) return
    await onlineGameHook.socket.emitWithAck('game:reset', {
      roomId: room.id
    })
    setShowVictoryModal(false)
    setWinner(null)
    setIsMoving(false)
    setIsRolling(false)
  }

  // 任务奖惩移动
  const movePlayerByTaskReward = async (
    playerId: string,
    steps: number,
    isForward: boolean,
    onComplete?: (playerId: string, finalPosition: number) => void,
  ) => {
    if (!room || steps <= 0) {
      onComplete && onComplete(playerId, players.find(p => p.id === playerId)?.position || 0)
      return
    }

    const playerIndex = players.findIndex(p => p.id === playerId)
    if (playerIndex === -1) return

    const direction = isForward ? 1 : -1
    const totalSteps = steps * direction
    const currentPosition = players[playerIndex].position
    const finalPosition = Math.max(0, Math.min(currentPosition + totalSteps, boardPath.length - 1))
    const actualSteps = finalPosition - currentPosition

    await movePlayerStepByStep(
      playerIndex,
      Math.abs(actualSteps),
      onComplete,
      direction > 0
    )
  }

  // 分步移动动画
  const movePlayerStepByStep = async (
    playerIndex: number,
    steps: number,
    onComplete?: (playerId: string, finalPosition: number) => void,
    isForward: boolean = true
  ) => {
    if (playerIndex < 0 || playerIndex >= players.length || steps <= 0) {
      onComplete && onComplete(players[playerIndex].id, players[playerIndex].position)
      return
    }

    const player = players[playerIndex]
    let remainingSteps = steps
    let currentPos = player.position

    // 分步移动动画
    while (remainingSteps > 0) {
      await new Promise(resolve => setTimeout(resolve, 300))
      remainingSteps -= 1
      currentPos = isForward ? currentPos + 1 : currentPos - 1
      currentPos = Math.max(0, Math.min(currentPos, boardPath.length - 1))
      
      // 更新动画值触发重新渲染
      playerMoveAnim.value = withTiming(Math.random(), { duration: 200 })
    }

    // 移动完成回调
    onComplete && onComplete(player.id, currentPos)
  }

  // 骰子动画样式
  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  if (!onlineGameHook.isConnected) return <LoadingScreen />
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
      {onlineGameHook.isWaitingForPlayers ? (
        <RoomWaiting
          isHost={onlineGameHook.isHost}
          maxPlayers={room.maxPlayers || 2}
          roomId={room.id || roomId || 'UNKNOWN'}
          players={players as OnlinePlayer[]}
          onStartGame={() => onlineGameHook.socket.startGame({ roomId: room.id })}
          onLeaveRoom={() => {
            onlineGameHook.socket.emit('room:leave')
            router.back()
          }}
        />
      ) : (
        <GameContent />
      )}

      {/* 任务弹窗 */}
      <TaskModal
        visible={showTaskModal}
        task={taskModalData}
        currentPlayer={currentPlayer as any}
        opponentPlayer={players.find(p => p.id !== currentPlayer?.id) as any}
        onComplete={handleTaskComplete}
        onClose={() => {
          setShowTaskModal(false)
          setPendingTaskType(null)
        }}
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={winner}
        availableTasks={taskSet?.tasks as any}
        onTasksSelected={() => {}}
        onRestart={handleResetGame}
        onExit={() => {
          onlineGameHook.socket.emit('game:exit', room.id)
          setShowVictoryModal(false)
          router.back()
        }}
        onClose={() => setShowVictoryModal(false)}
      />
    </>
  )

  // 游戏内容组件
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
                {room.gameStatus === 'waiting'
                  ? t('flyingChess.gameStatus.waiting', '准备开始')
                  : room.gameStatus === 'playing'
                    ? t('flyingChess.gameStatus.playing', '游戏进行中')
                    : t('flyingChess.gameStatus.finished', '游戏结束')}
              </Text>
              {room.gameStatus === 'playing' && currentPlayer && (
                <Text
                  style={[styles.currentPlayerText, { color: currentPlayer.color }]}
                >
                  {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: currentPlayer.name,
                  })}
                </Text>
              )}
            </View>

            {room.gameStatus === 'playing' && (
              <View style={styles.diceContainer}>
                <View style={styles.diceWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.diceButton,
                      {
                        backgroundColor: !isMyTurn || isRolling || isMoving
                          ? '#FF6B6B80'
                          : colors.settingsAccent,
                        borderWidth: 3,
                        borderColor: 'white',
                      },
                    ]}
                    onPress={rollDice}
                    disabled={!isMyTurn || isRolling || isMoving}
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
                  {!isMyTurn
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
              {players.map((player) => (
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
                  <PlayerAvatar iconType={player.iconType} color={player.color} size={32} />
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
              players={players as any}
              currentPlayer={onlineGameHook.currentPlayerIndex as number}
              boardData={boardPath}
              moveProgress={playerMoveAnim.value}
            />
          </View>
        </ScrollView>
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
