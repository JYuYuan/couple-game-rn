import React, { useEffect, useMemo, useState, useRef } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors, CommonStyles, Layout } from '@/constants/theme'
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

  // 使用 state 管理 currentUserId，避免依赖 room 状态同步
  const [currentUserId, setCurrentUserId] = useState<string | null>(room?.currentUser || null)

  // 初始化和同步 currentUserId
  useEffect(() => {
    if (room?.currentUser) {
      console.log(`🔄 初始化/同步 currentUserId: ${currentUserId} → ${room.currentUser}`)
      setCurrentUserId(room.currentUser)
    }
  }, [room?.currentUser, room?.gameStatus]) // 当游戏状态变化时也同步

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
  const lastTaskIdRef = useRef<string | null>(null) // 使用ref避免闭包问题

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
  const [animatedPlayers, setAnimatedPlayers] = useState<OnlinePlayer[]>(players as OnlinePlayer[])

  // 动态计算玩家卡片宽度
  const { width: screenWidth } = Dimensions.get('window')
  const maxContainerWidth = Math.min(screenWidth - 32, Layout.maxWidth) // 减去外边距
  const playerCount = animatedPlayers.length || 1
  const availableWidth = maxContainerWidth - 32 // 减去padding
  const cardSpacing = Layout.spacing.sm * (playerCount - 1) // 卡片间距
  const calculatedCardWidth = Math.max(90, (availableWidth - cardSpacing) / playerCount) // 最小90px

  const playerCardWidth =
    playerCount <= 4
      ? calculatedCardWidth // 4人以下平分宽度
      : 90 // 4人以上固定90px，启用横向滚动
  // 本地骰子状态 - 通过 game:dice 事件更新
  const [currentDiceValue, setCurrentDiceValue] = useState<number | null>(null)

  // 重新开始游戏
  const handleRestartGame = () => {
    console.log('🔄 请求重新开始游戏')
    // 发送重新开始请求给服务端
    socket.startGame({ roomId: room?.id })
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

    // 关闭弹窗并重置防重复标识
    setShowTaskModal(false)
    setTaskModalData(null)
    lastTaskIdRef.current = null // 重置ref
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
        playerId: playerId, // 使用当前登录用户的ID，而不是 currentPlayer?.id
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

  // 监听游戏事件 - 简化的事件监听
  useDeepCompareEffect(() => {
    if (!socket.isConnected) {
      console.log('❌ Socket 未连接，跳过事件监听器注册')
      return
    }

    console.log('✅ 注册游戏事件监听器')
    
    // 监听骰子事件
    const handleDiceRoll = (data: { playerId: string; diceValue: number; timestamp: number }) => {
      console.log('🎲 收到骰子事件:', data)
      setCurrentDiceValue(data.diceValue)

      // 重置骰子状态
      if (data.playerId === playerId) {
        // 播放音效（动画已在点击时开始）
        audioManager.playSoundEffect('dice')
        // 重置滚动状态
        setIsRolling(false)
      }

      // 开始移动动画 - 计算目标位置
      const currentPlayer = players?.find(p => p.id === data.playerId)
      if (currentPlayer) {
        const currentPos = currentPlayer.position || 0
        const boardSize = room?.gameState?.boardSize || 50
        const finishLine = boardSize - 1
        let targetPos = currentPos + data.diceValue

        // 处理超出终点的情况（反弹）
        if (targetPos > finishLine) {
          const excess = targetPos - finishLine
          targetPos = finishLine - excess
        }
        targetPos = Math.max(0, targetPos)

        console.log(`🎯 开始移动动画: ${data.playerId} 从 ${currentPos} 移动到 ${targetPos}`)
        
        // 设置移动状态
        setIsMoving(true)

        // 播放移动音效
        audioManager.playSoundEffect('step')

        // 执行移动动画
        movePlayerStepByStep(data.playerId, currentPos, targetPos, () => {
          // 动画完成后确保玩家在最终位置
          setAnimatedPlayers((prevPlayers) => {
            return prevPlayers.map((p) =>
              p.id === data.playerId ? { ...p, position: targetPos } : p,
            )
          })
          setIsMoving(false)

          // 通知服务端移动已完成
          console.log(`✅ 移动动画完成，通知服务端: ${data.playerId} 到达位置 ${targetPos}`)
          socket.runActions('move_complete', { 
            roomId: room?.id,
            playerId: data.playerId,
            position: targetPos
          })
        })
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
      console.log('📋 当前玩家列表:', players)

      // 防重复机制 - 检查是否是同一个任务
      const taskId = `${data.task.id}-${data.taskType}-${data.triggerPlayerIds.join(',')}`
      if (taskId === lastTaskIdRef.current) {
        console.log('🚫 重复任务事件，跳过处理')
        return
      }
      lastTaskIdRef.current = taskId

      // 查找执行者信息
      const executorPlayers = players?.filter((p) => data.executorPlayerIds.includes(p.id)) || []
      console.log('👥 找到的执行者:', executorPlayers)

      // 检查当前玩家是否是执行者
      const isExecutor = data.executorPlayerIds.includes(playerId)
      console.log(`🎯 当前玩家权限检查: 是否为执行者=${isExecutor}`)

      // 所有玩家都能看到任务，但只有执行者能操作
      const taskData = {
        id: data.task.id,
        type: data.taskType as 'trap' | 'star' | 'collision',
        title: data.task.title,
        description: data.task.description,
        category: data.task.category,
        difficulty: data.task.difficulty,
        triggerPlayerIds: data.triggerPlayerIds.map((id) => parseInt(id)),
        executors: executorPlayers,
        isExecutor, // 添加执行者标识
      }

      console.log('🎭 设置任务弹窗数据:', taskData)
      setTaskModalData(taskData)
      setShowTaskModal(true)
      console.log('✅ 任务弹窗应该已显示')
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
        setAnimatedPlayers((prevPlayers) => {
          return prevPlayers.map((p) =>
            p.id === data.playerId ? { ...p, position: data.toPosition } : p,
          )
        })
        setIsMoving(false)

        // 通知服务端移动已完成，触发下一个玩家
        socket.runActions('move_complete', { roomId: room?.id })

        console.log(`✅ 玩家 ${data.playerId} 移动动画完成，最终位置: ${data.toPosition}`)
      })
    }

    // 监听用户切换事件
    const handleNextPlayer = (data: { currentUser: string; roomId: string }) => {
      console.log('🔄 收到用户切换事件:', data)

      // 立即更新 currentUserId state
      console.log(`🔄 更新 currentUserId: ${currentUserId} → ${data.currentUser}`)
      setCurrentUserId(data.currentUser)

      // 使用统一的playerId进行判断，确保逻辑一致
      const isMyTurn = data.currentUser === playerId

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

    // 监听位置更新事件（任务完成后的位置变化）
    const handlePositionUpdate = (data: {
      playerId: string
      fromPosition: number
      toPosition: number
      reason: string
    }) => {
      console.log('📍 收到位置更新事件:', data)

      // 播放移动音效
      audioManager.playSoundEffect('step')

      // 设置移动状态
      setIsMoving(true)

      // 执行移动动画
      movePlayerStepByStep(data.playerId, data.fromPosition, data.toPosition, () => {
        // 动画完成后确保玩家在最终位置
        setAnimatedPlayers((prevPlayers) => {
          return prevPlayers.map((p) =>
            p.id === data.playerId ? { ...p, position: data.toPosition } : p,
          )
        })
        setIsMoving(false)

        console.log(`✅ 位置更新动画完成: ${data.playerId} 从 ${data.fromPosition} 移动到 ${data.toPosition}，原因: ${data.reason}`)
      })
    }

    // 注册事件监听器
    console.log('🎮 注册游戏事件监听器, isConnected:', socket.isConnected, 'playerId:', playerId)
    socket.on('game:dice', handleDiceRoll)
    socket.on('game:task', handleTaskTrigger)
    socket.on('game:victory', handleGameVictory)
    socket.on('game:move', handlePlayerMove)
    socket.on('game:next', handleNextPlayer)
    socket.on('game:position_update', handlePositionUpdate)

    // 清理函数
    return () => {
      console.log('🧹 清理游戏事件监听器')
      socket.off('game:dice', handleDiceRoll)
      socket.off('game:task', handleTaskTrigger)
      socket.off('game:victory', handleGameVictory)
      socket.off('game:move', handlePlayerMove)
      socket.off('game:next', handleNextPlayer)
      socket.off('game:position_update', handlePositionUpdate)
    }
  }, [socket.isConnected, playerId, room?.id]) // 添加 room?.id 作为依赖，确保房间变化时重新注册

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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.playersScrollContainer,
                // 根据玩家数量动态调整布局
                playerCount <= 4
                  ? { justifyContent: 'space-around', minWidth: '100%' } // 4人以下平分空间
                  : { justifyContent: 'flex-start' }, // 4人以上左对齐，启用滚动
              ]}
              style={styles.playersScroll}
              scrollEnabled={playerCount > 4} // 只有超过4人才允许滚动
            >
              {animatedPlayers.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      width: playerCardWidth, // 使用动态计算的宽度
                      backgroundColor: player.color + '15',
                      borderColor: currentPlayer?.id === player.id ? player.color : 'transparent',
                      borderWidth: currentPlayer?.id === player.id ? 3 : 1,
                      borderStyle: currentPlayer?.id === player.id ? 'solid' : 'dashed',
                      opacity: currentPlayer?.id === player.id ? 1 : 0.8,
                      transform:
                        currentPlayer?.id === player.id ? [{ scale: 1.02 }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  {/* 当前玩家指示器 */}
                  {currentPlayer?.id === player.id && (
                    <View style={styles.currentPlayerIndicator}>
                      <Ionicons name="play" size={6} color={player.color} />
                    </View>
                  )}

                  {/* 玩家头像 */}
                  <View style={[styles.playerAvatarContainer, { borderColor: player.color }]}>
                    <PlayerIcon see={player.iconType} />
                  </View>

                  {/* 玩家信息 */}
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text
                        style={[styles.playerName, { color: colors.homeCardTitle }]}
                        numberOfLines={1}
                      >
                        {player.name}
                      </Text>
                      {player?.isHost && <Ionicons name="star" size={8} color="#FFD700" />}
                    </View>

                    <Text style={[styles.playerPosition, { color: colors.homeCardDescription }]}>
                      {t('flyingChess.position', '位置: {{position}}', {
                        position: player.position + 1,
                      })}
                    </Text>
                  </View>

                  {/* 玩家排名 */}
                  <View style={[styles.playerRank]}>
                    <View style={styles.connectionStatus}>
                      <View
                        style={[
                          styles.connectionDot,
                          {
                            backgroundColor: player?.isConnected ? '#4CAF50' : '#FF6B6B',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
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
          onClose={() => {
            setShowTaskModal(false)
            lastTaskIdRef.current = null // 重置ref
          }}
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
  ...CommonStyles, // 继承通用样式

  // 覆盖特定的样式
  contentContainer: {
    ...CommonStyles.contentContainer,
    paddingBottom: 80, // 游戏界面需要更多底部空间
  },

  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.padding.md,
    borderRadius: 12,
    marginBottom: Layout.spacing.md,
    flexWrap: 'wrap', // 允许换行，防止在小屏幕上挤压
    gap: Layout.spacing.md, // 添加间距
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
    gap: Layout.spacing.md,
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
    ...CommonStyles.cardContainer,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Layout.spacing.sm,
  },
  playersScroll: {
    width: '100%',
  },
  playersScrollContainer: {
    paddingHorizontal: Layout.spacing.xs,
    gap: Layout.spacing.sm,
    alignItems: 'center',
    // 根据玩家数量决定滚动行为
    flexGrow: 1,
  },
  playerCard: {
    // 移除固定宽度，由动态计算提供
    minWidth: 90, // 最小宽度90px
    maxWidth: 160,
    minHeight: 60, // 进一步缩小高度 (从80到60)
    flexDirection: 'column', // 改为垂直布局
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.xs, // 减小内边距到最小
    borderRadius: 6, // 减小圆角
    position: 'relative',
    marginHorizontal: 2, // 减小外边距
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // 减小阴影
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  currentPlayerIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12, // 按比例缩小 (从16到12)
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  playerAvatarContainer: {
    width: 30, // 按比例缩小 (从40到30)
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5, // 按比例缩小边框
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 3, // 减小间距
  },
  playerInfo: {
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2, // 进一步减小间距
    marginBottom: 2,
  },
  playerName: {
    fontSize: 11, // 进一步缩小字体 (从12到11)
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 60, // 减小最大宽度 (从80到60)
  },
  playerPosition: {
    fontSize: 9, // 进一步缩小字体 (从10到9)
    textAlign: 'center',
    marginBottom: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2, // 减小间距
  },
  connectionDot: {
    width: 4, // 进一步缩小 (从5到4)
    height: 4,
    borderRadius: 2,
  },
  connectionText: {
    fontSize: 8, // 进一步缩小字体 (从9到8)
    fontWeight: '500',
  },
  playerRank: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 14, // 按比例缩小 (从18到14)
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerRankText: {
    fontSize: 8, // 缩小字体 (从9到8)
    fontWeight: '700',
    color: 'white',
  },
  boardSection: {
    borderRadius: 12,
    marginBottom: Layout.spacing.md,
    overflow: 'hidden',
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.padding.md,
    paddingVertical: Layout.padding.sm,
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
    paddingHorizontal: Layout.padding.md,
    paddingVertical: Layout.padding.sm,
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
