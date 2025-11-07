/**
 * Flying Chess 在线模式 - 适配器
 * 简化为适配器模式,使用GameCore统一UI
 * 保留Socket事件处理和在线特有逻辑
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { usePageBase } from '@/hooks/usePageBase'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { OnlinePlayer, TaskModalData } from '@/types/online'
import { GamePlayer } from '@/hooks/use-game-players'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore, useSettingsStore } from '@/store'
import { useDeepCompareEffect } from 'ahooks'
import toast from '@/utils/toast'
import GameCore from './shared/GameCore'

export default function FlyingChessGame() {
  const router = useRouter()
  const navigation = useNavigation()
  const { colors, t } = usePageBase()
  const { playerId } = useSettingsStore()
  const socket = useSocket()
  const audioManager = useAudioManager()

  // 房间状态
  const { currentRoom: room, clearRoom } = useRoomStore()
  const players = room?.players || []
  const boardPath = room?.boardPath || []
  const taskSet = room?.taskSet
  const [currentUserId, setCurrentUserId] = useState<string | null>(room?.currentUser || null)

  // 游戏状态
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)
  const [currentDiceValue, setCurrentDiceValue] = useState<number | null>(null)

  // Refs
  const isLeavingRef = useRef(false)
  const lastTaskIdRef = useRef<string | null>(null)
  const isAnimatingRef = useRef(false)

  // 用于动画的本地玩家状态
  const [animatedPlayers, setAnimatedPlayers] = useState<OnlinePlayer[]>(players as OnlinePlayer[])
  const animatedPlayersRef = useRef<OnlinePlayer[]>(animatedPlayers)

  // 动画
  const diceRotation = useSharedValue(0)
  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  // 计算当前玩家信息
  const isOwnTurn = useMemo(() => currentUserId === playerId, [currentUserId, playerId])
  const isHost = useMemo(() => room?.hostId === playerId, [room?.hostId, playerId])
  const currentPlayer = useMemo(
    () => players?.find((item) => currentUserId === item.id) || null,
    [players, currentUserId]
  )
  const currentPlayerIndex = useMemo(
    () => players?.findIndex((item) => currentUserId === item.id) ?? -1,
    [players, currentUserId]
  )

  // 同步 ref
  useEffect(() => {
    animatedPlayersRef.current = animatedPlayers
  }, [animatedPlayers])

  // 初始化和同步 currentUserId
  useEffect(() => {
    if (room?.currentUser) {
      console.log(`🔄 初始化/同步 currentUserId: ${currentUserId} → ${room.currentUser}`)
      setCurrentUserId(room.currentUser)
    }
  }, [room?.currentUser, room?.gameStatus])

  // 同步服务端玩家位置到本地动画状态
  useDeepCompareEffect(() => {
    if (isAnimatingRef.current || isMoving) return

    if (players && players.length > 0) {
      const needsUpdate = players.some((serverPlayer, index) => {
        const localPlayer = animatedPlayers[index]
        return (
          !localPlayer ||
          localPlayer.id !== serverPlayer.id ||
          localPlayer.position !== serverPlayer.position ||
          localPlayer.name !== serverPlayer.name
        )
      })

      if (needsUpdate) {
        console.log('🔄 同步服务端玩家状态到本地动画状态')
        setAnimatedPlayers(players as OnlinePlayer[])
      }
    }
  }, [players, isMoving])

  // 监听返回按钮
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (_e) => {
      console.log('🚪 检测到返回操作，清除房间状态')
      isLeavingRef.current = true
      clearRoom()
      if (room?.id) socket.leaveRoom()
    })
    return unsubscribe
  }, [navigation, room?.id, clearRoom])

  // 游戏状态变化处理
  useEffect(() => {
    if (isLeavingRef.current) return
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

  // ===================
  // 玩家移动动画
  // ===================
  const movePlayerStepByStep = (
    playerId: string,
    from: number,
    to: number,
    onComplete?: () => void
  ) => {
    const steps = Math.abs(to - from)
    const isForward = to > from
    let currentStep = 0

    const moveOneStep = () => {
      if (currentStep >= steps) {
        onComplete?.()
        return
      }

      currentStep++
      const nextPosition = isForward ? from + currentStep : from - currentStep

      setAnimatedPlayers((prevPlayers) =>
        prevPlayers.map((p) => (p.id === playerId ? { ...p, position: nextPosition } : p))
      )

      if (currentStep % 2 === 0) {
        audioManager.playSoundEffect('step')
      }

      setTimeout(moveOneStep, 300)
    }

    moveOneStep()
  }

  // ===================
  // Socket 事件处理
  // ===================

  // 骰子事件
  const handleDiceRoll = useCallback(
    (data: { playerId: string; diceValue: number }) => {
      console.log('🎲 收到骰子事件:', data)

      const isCurrentPlayer = data.playerId === playerId
      const delay = isCurrentPlayer && isRolling ? 1500 : 0

      setTimeout(() => {
        diceRotation.value = withTiming(0, { duration: 300 })
        setCurrentDiceValue(data.diceValue)

        if (isCurrentPlayer) {
          audioManager.playSoundEffect('dice')
          setIsRolling(false)
        }

        setTimeout(() => {
          const currentPlayer = animatedPlayersRef.current?.find((p) => p.id === data.playerId)
          if (currentPlayer) {
            const currentPos = currentPlayer.position || 0
            const boardSize = room?.gameState?.boardSize || 50
            const finishLine = boardSize - 1
            let targetPos = currentPos + data.diceValue

            // 处理反弹
            if (targetPos > finishLine) {
              const excess = targetPos - finishLine
              targetPos = finishLine - excess
            }
            targetPos = Math.max(0, targetPos)

            console.log(`🎯 开始移动动画: ${data.playerId} 从 ${currentPos} 移动到 ${targetPos}`)

            isAnimatingRef.current = true
            setIsMoving(true)
            audioManager.playSoundEffect('step')

            movePlayerStepByStep(data.playerId, currentPos, targetPos, () => {
              setAnimatedPlayers((prevPlayers) =>
                prevPlayers.map((p) => (p.id === data.playerId ? { ...p, position: targetPos } : p))
              )

              console.log(`✅ 移动动画完成，通知服务端: ${data.playerId} 到达位置 ${targetPos}`)
              socket.runActions('move_complete', {
                roomId: room?.id,
                playerId: data.playerId,
              })

              setTimeout(() => {
                setIsMoving(false)
                isAnimatingRef.current = false
              }, 200)
            })
          }
        }, 500)
      }, delay)
    },
    [playerId, isRolling, diceRotation, audioManager, room?.gameState?.boardSize, socket, room?.id]
  )

  // 任务触发事件
  const handleTaskTrigger = useCallback(
    (data: { task: TaskModalData }) => {
      console.log('📋 收到任务触发事件:', data)

      // 防止重复显示相同任务
      if (lastTaskIdRef.current === data.task.id) {
        console.log('⚠️ 任务已显示,跳过重复')
        return
      }

      lastTaskIdRef.current = data.task.id
      setTaskModalData(data.task)
      setShowTaskModal(true)
      audioManager.playSoundEffect('step') // 使用step音效替代task
    },
    [audioManager]
  )

  // 任务完成事件
  const handleTaskCompleted = useCallback((data: { playerId: string; completed: boolean }) => {
    console.log('✅ 收到任务完成事件:', data)
    setShowTaskModal(false)
    setTaskModalData(null)
    lastTaskIdRef.current = null
  }, [])

  // 胜利事件
  const handleGameVictory = useCallback(
    (data: { winner: { id: string; name: string; color: string } }) => {
      console.log('🏆 收到胜利事件:', data)

      const victoryPlayer: any = {
        // 使用any避免类型冲突
        id: parseInt(data.winner.id),
        name: data.winner.name,
        position: 0,
        color: data.winner.color,
        avatarId: '',
      }

      setWinner(victoryPlayer)
      setShowVictoryModal(true)
      audioManager.playSoundEffect('victory')
    },
    [audioManager]
  )

  // 下一个玩家事件
  const handleNextPlayer = useCallback((data: { nextPlayerId: string }) => {
    console.log('🔄 收到下一玩家事件:', data)
    setCurrentUserId(data.nextPlayerId)
    setCurrentDiceValue(null)
  }, [])

  // 位置更新事件
  const handlePositionUpdate = useCallback(
    (data: { playerId: string; position: number; isForward: boolean }) => {
      console.log('📍 收到位置更新事件:', data)

      const currentPlayer = animatedPlayersRef.current?.find((p) => p.id === data.playerId)
      if (!currentPlayer) return

      const currentPos = currentPlayer.position || 0
      const targetPos = data.position

      isAnimatingRef.current = true
      setIsMoving(true)

      movePlayerStepByStep(data.playerId, currentPos, targetPos, () => {
        setAnimatedPlayers((prevPlayers) =>
          prevPlayers.map((p) => (p.id === data.playerId ? { ...p, position: targetPos } : p))
        )

        setTimeout(() => {
          setIsMoving(false)
          isAnimatingRef.current = false
        }, 200)
      })
    },
    []
  )

  // 房间销毁事件
  const handleRoomDestroyed = useCallback(() => {
    console.log('🚪 房间已销毁')
    toast.error(t('room.destroyed', '房间已被销毁'))
    isLeavingRef.current = true
    clearRoom()
    router.replace('/')
  }, [clearRoom, router, t])

  // 注册 Socket 事件监听
  useEffect(() => {
    console.log('🎮 注册游戏事件监听器')

    socket.on('game:dice', handleDiceRoll)
    socket.on('game:task', handleTaskTrigger)
    socket.on('game:victory', handleGameVictory)
    socket.on('game:next', handleNextPlayer)
    socket.on('game:position_update', handlePositionUpdate)
    socket.on('game:task_completed', handleTaskCompleted)
    socket.on('room:destroyed', handleRoomDestroyed)

    return () => {
      console.log('🧹 清理游戏事件监听器')
      socket.off('game:dice', handleDiceRoll)
      socket.off('game:task', handleTaskTrigger)
      socket.off('game:victory', handleGameVictory)
      socket.off('game:next', handleNextPlayer)
      socket.off('game:position_update', handlePositionUpdate)
      socket.off('game:task_completed', handleTaskCompleted)
      socket.off('room:destroyed', handleRoomDestroyed)
    }
  }, [
    handleDiceRoll,
    handleTaskTrigger,
    handleGameVictory,
    handleNextPlayer,
    handlePositionUpdate,
    handleTaskCompleted,
    handleRoomDestroyed,
  ])

  // ===================
  // 用户操作处理
  // ===================

  // 投骰子
  const handleDiceRollClick = async () => {
    if (isRolling || isMoving || !isOwnTurn) {
      console.warn('不能投掷骰子: 状态不允许')
      return
    }

    console.log('🎲 请求投掷骰子')
    setIsRolling(true)
    audioManager.playSoundEffect('dice')
    diceRotation.value = withTiming(360 * 4, { duration: 1500 })

    try {
      socket.rollDice({
        roomId: room?.id,
        playerId: playerId,
      })
    } catch (error) {
      console.error('投掷骰子失败:', error)
      setIsRolling(false)
      diceRotation.value = withTiming(0, { duration: 300 })
    }
  }

  // 任务完成
  const handleTaskComplete = (completed: boolean) => {
    if (!taskModalData) return

    console.log(`📋 任务完成反馈: ${completed ? '成功' : '失败'}`)
    audioManager.playSoundEffect(completed ? 'victory' : 'step')

    socket.completeTask({
      roomId: room?.id,
      taskId: taskModalData.id,
      playerId: taskModalData.executors[0]?.id.toString() || '',
      completed,
    })

    setShowTaskModal(false)
    setTaskModalData(null)
    lastTaskIdRef.current = null
  }

  // 重新开始游戏
  const handleRestartGame = () => {
    console.log('🔄 请求重新开始游戏')
    socket.startGame({ roomId: room?.id })
  }

  // 离开房间
  const handleLeaveRoom = () => {
    console.log('🚪 请求离开房间')
    if (!room?.id) return

    isLeavingRef.current = true
    clearRoom()
    socket.leaveRoom()

    setTimeout(() => {
      router.replace('/')
    }, 100)
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${taskSet?.name || ''}-${t('flyingChess.title', '飞行棋')}`,
          headerShown: true,
          headerStyle: { backgroundColor: colors.homeBackground },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerBackTitle: t('flyingChess.headerBackTitle', '返回'),
        }}
      />
      <GameCore
        mode="online"
        gameStatus={room?.gameStatus || 'waiting'}
        players={animatedPlayers}
        currentPlayer={currentPlayer as any} // 类型兼容性转换
        currentPlayerIndex={currentPlayerIndex}
        boardPath={boardPath}
        diceValue={currentDiceValue || 0}
        isRolling={isRolling}
        isMoving={isMoving}
        showTaskModal={showTaskModal}
        taskModalData={taskModalData}
        showVictoryModal={showVictoryModal}
        winner={winner}
        onDiceRoll={handleDiceRollClick}
        onTaskComplete={handleTaskComplete}
        onResetGame={handleRestartGame}
        onExit={handleLeaveRoom}
        colors={colors}
        t={t}
        isOwnTurn={isOwnTurn}
        isHost={isHost}
        diceAnimatedStyle={diceAnimatedStyle}
      />
    </>
  )
}
