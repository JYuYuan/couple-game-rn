/**
 * Flying Chess 在线模式 - 适配器
 * 简化为适配器模式,使用GameCore统一UI
 * 保留Socket事件处理和在线特有逻辑
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { usePageBase } from '@/hooks/usePageBase'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { NetworkPlayer, OnlinePlayer, TaskModalData } from '@/types/online'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore, useSettingsStore } from '@/store'
import { useDeepCompareEffect } from 'ahooks'
import toast from '@/utils/toast'
import GameCore from './shared/GameCore'
import { ExecutorTaskModal, ObserverTaskModal } from '@/components/onlineTaskModal'

// 动画延迟常量 - 统一管理所有动画时间
const ANIMATION_DELAYS = {
  STEP: 300, // 每步移动延迟（毫秒）
  DICE_REVEAL: 500, // 骰子显示延迟（毫秒）
  MOVE_COMPLETE: 200, // 移动完成延迟（毫秒）
  DICE_ROLL: 1500, // 骰子滚动动画时长（毫秒）
  DICE_ANIMATION: 300, // 骰子动画时长（毫秒）
  EXIT_DELAY: 100, // 退出房间延迟（毫秒）
} as const

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
  const [showObserverModal, setShowObserverModal] = useState(false) // 🐾 新增：观察者弹窗状态
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<any>(null)
  const [currentDiceValue, setCurrentDiceValue] = useState<number | null>(null)

  // Refs
  const isLeavingRef = useRef(false)
  const lastTaskIdRef = useRef<string | null>(null)
  const isAnimatingRef = useRef(false)
  const timersRef = useRef<Set<number>>(new Set()) // 追踪所有活跃的定时器

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
    [players, currentUserId],
  )

  const currentPlayerIndex = useMemo(
    () => players?.findIndex((item) => currentUserId === item.id) ?? -1,
    [players, currentUserId],
  )

  const currentExecutorTask = useMemo(
    () =>
      taskModalData?.executorTasks?.find(
        (et) => et.executor.id.toString() === playerId?.toString(),
      ) || null,
    [taskModalData, playerId],
  )

  // 同步 ref
  useEffect(() => {
    animatedPlayersRef.current = animatedPlayers
  }, [animatedPlayers])

  // 清理所有定时器 - 防止内存泄漏
  useEffect(() => {
    return () => {
      console.log('🧹 清理所有活跃的定时器')
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

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
        setAnimatedPlayers(players as OnlinePlayer[])
      }
    }
  }, [players, isMoving])

  // 监听返回按钮
  useEffect(() => {
    return navigation.addListener('beforeRemove', (_e) => {
      console.log('🚪 检测到返回操作，清除房间状态')
      isLeavingRef.current = true
      clearRoom()
      if (room?.id) socket.leaveRoom()
    })
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
    onComplete?: () => void,
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
        prevPlayers.map((p) => (p.id === playerId ? { ...p, position: nextPosition } : p)),
      )

      if (currentStep % 2 === 0) {
        audioManager.playSoundEffect('step')
      }

      // 使用定时器追踪系统
      const timer = setTimeout(moveOneStep, ANIMATION_DELAYS.STEP)
      timersRef.current.add(timer)

      // 完成后清理定时器
      if (currentStep >= steps - 1) {
        timersRef.current.delete(timer)
      }
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

      // 🔧 FIX: 立即锁定动画状态，防止在延迟期间服务端同步位置导致跳转
      console.log('🔒 锁定动画状态，防止服务端同步')
      isAnimatingRef.current = true
      setIsMoving(true)

      // 🔧 FIX: 收到结果时播放骰子动画（所有玩家都播放相同的动画）
      console.log('🎲 播放骰子动画')
      audioManager.playSoundEffect('dice')
      diceRotation.value = withTiming(360 * 4, { duration: ANIMATION_DELAYS.DICE_ROLL })

      // 等待骰子动画完成
      const timer1 = setTimeout(() => {
        // 动画完成，停止旋转并显示结果
        diceRotation.value = withTiming(0, { duration: ANIMATION_DELAYS.DICE_ANIMATION })
        setCurrentDiceValue(data.diceValue)
        setIsRolling(false)

        // 延迟一段时间后开始移动玩家
        const timer2 = setTimeout(() => {
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

            audioManager.playSoundEffect('step')

            movePlayerStepByStep(data.playerId, currentPos, targetPos, () => {
              setAnimatedPlayers((prevPlayers) =>
                prevPlayers.map((p) =>
                  p.id === data.playerId ? { ...p, position: targetPos } : p,
                ),
              )

              console.log(`✅ 移动动画完成，通知服务端: ${data.playerId} 到达位置 ${targetPos}`)

              try {
                socket.runActions('move_complete', {
                  roomId: room?.id,
                  playerId: data.playerId,
                })
              } catch (error) {
                console.error('通知服务端移动完成失败:', error)
              }

              const timer3 = setTimeout(() => {
                setIsMoving(false)
                isAnimatingRef.current = false
                console.log('🔓 解锁动画状态')
                timersRef.current.delete(timer3)
              }, ANIMATION_DELAYS.MOVE_COMPLETE)
              timersRef.current.add(timer3)
            })
          } else {
            // 🔧 FIX: 如果没有找到玩家，也要解锁状态
            console.warn('⚠️ 未找到玩家，解锁动画状态')
            setIsMoving(false)
            isAnimatingRef.current = false
          }
          timersRef.current.delete(timer2)
        }, ANIMATION_DELAYS.DICE_REVEAL)
        timersRef.current.add(timer2)

        timersRef.current.delete(timer1)
      }, ANIMATION_DELAYS.DICE_ROLL)
      timersRef.current.add(timer1)
    },
    [diceRotation, audioManager, room?.gameState?.boardSize, socket, room?.id],
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

      // 🐾 判断当前玩家是否是执行者
      const currentExecutorTask = data.task.executorTasks?.find(
        (et) => et.executor.id.toString() === playerId?.toString(),
      )

      if (currentExecutorTask && !currentExecutorTask.completed) {
        // 当前玩家是执行者且未完成 -> 显示执行者弹窗
        console.log('👤 当前玩家是执行者，显示执行者弹窗')
        setShowTaskModal(true)
        setShowObserverModal(false)
      } else {
        // 当前玩家不是执行者或已完成 -> 显示观察者弹窗
        console.log('👁️ 当前玩家是观察者，显示观察者弹窗')
        setShowTaskModal(false)
        setShowObserverModal(true)
      }

      audioManager.playSoundEffect('step') // 使用step音效替代task
    },
    [audioManager, playerId],
  )

  // 任务完成事件（部分完成）
  const handleTaskCompleted = useCallback(
    (data: {
      playerId: string
      completed: boolean
      content: number
      playerName: string
      allCompleted: boolean
      currentTask?: TaskModalData
    }) => {
      console.log('✅ 收到任务完成事件:', data)

      // 🐾 更新 taskModalData，显示最新的执行者状态
      if (data.currentTask) {
        setTaskModalData(data.currentTask)
        console.log('📝 更新任务数据，显示最新执行者状态')

        // 🐾 如果当前玩家刚完成任务，切换到观察者弹窗
        if (data.playerId === playerId) {
          console.log('🔄 当前玩家完成任务，切换到观察者弹窗')
          setShowTaskModal(false)
          setShowObserverModal(true)
        }
      }

      // 显示 Toast 提示
      let resultMessage = data.completed
        ? t('taskModal.observerCompleted', '任务已完成！玩家获得奖励')
        : t('taskModal.observerFailed', '任务失败！玩家受到惩罚')

      let content = ''
      if (data.content === 0) content = t('taskModal.backToStart', '回到起点')
      else if (data.content > 0) content = t('taskModal.moveForward', `前进${data.content}步`)
      else content = t('taskModal.moveBackward', `后退${Math.abs(data.content)}步`)

      resultMessage = `${data.playerName}: ${resultMessage}，${content}`

      // 显示不同类型的提示
      if (data.completed) {
        toast.success(resultMessage)
      } else {
        toast.error(resultMessage)
      }

      console.log(`📢 任务完成通知: ${resultMessage}`)

      // 🐾 注意：这里不关闭弹窗，等待所有执行者完成
    },
    [t, playerId],
  )

  // 🐾 所有任务完成事件
  const handleAllTasksCompleted = useCallback(
    (data: { taskType: string; timestamp: number }) => {
      console.log('🎉 所有任务已完成:', data)

      // 关闭所有任务弹窗
      setShowTaskModal(false)
      setShowObserverModal(false) // 🐾 同时关闭观察者弹窗
      setTaskModalData(null)
      lastTaskIdRef.current = null
    },
    [t],
  )

  // 胜利事件
  const handleGameVictory = useCallback(
    (data: { winner: NetworkPlayer }) => {
      console.log('🏆 收到胜利事件:', data)

      setWinner(data.winner)
      setShowVictoryModal(true)
      audioManager.playSoundEffect('victory')
    },
    [audioManager],
  )

  // 下一个玩家事件
  const handleNextPlayer = useCallback((data: { nextPlayerId: string }) => {
    console.log('🔄 收到下一玩家事件:', data)
    setCurrentUserId(data.nextPlayerId)
    setCurrentDiceValue(null)
  }, [])

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
    socket.on('game:dice', handleDiceRoll)
    socket.on('game:task', handleTaskTrigger)
    socket.on('game:victory', handleGameVictory)
    socket.on('game:next', handleNextPlayer)
    socket.on('game:task_completed', handleTaskCompleted)
    socket.on('game:all_tasks_completed', handleAllTasksCompleted) // 🐾 新增：所有任务完成事件
    socket.on('room:destroyed', handleRoomDestroyed)

    return () => {
      socket.off('game:dice', handleDiceRoll)
      socket.off('game:task', handleTaskTrigger)
      socket.off('game:victory', handleGameVictory)
      socket.off('game:next', handleNextPlayer)
      socket.off('game:task_completed', handleTaskCompleted)
      socket.off('game:all_tasks_completed', handleAllTasksCompleted) // 🐾 新增
      socket.off('room:destroyed', handleRoomDestroyed)
    }
  }, [
    handleDiceRoll,
    handleTaskTrigger,
    handleGameVictory,
    handleNextPlayer,
    handleTaskCompleted,
    handleAllTasksCompleted, // 🐾 新增
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
    // 🔧 FIX: 只发送请求，不播放动画（动画在收到结果时播放）
    setIsRolling(true) // 标记为正在投掷，防止重复点击

    try {
      socket.rollDice({
        roomId: room?.id,
        playerId: playerId,
      })
    } catch (error) {
      console.error('投掷骰子失败:', error)
      toast.error(t('error.rollDice', '投掷骰子失败，请重试'))
      setIsRolling(false)
    }
  }

  // 任务完成
  const handleTaskComplete = (completed: boolean) => {
    if (!taskModalData) return

    console.log(`📋 任务完成反馈: ${completed ? '成功' : '失败'}`)
    audioManager.playSoundEffect(completed ? 'victory' : 'step')

    try {
      socket.completeTask({
        roomId: room?.id,
        taskId: taskModalData.id,
        playerId: playerId,
        completed,
      })
    } catch (error) {
      console.error('提交任务完成状态失败:', error)
      toast.error(t('error.completeTask', '提交任务失败，请重试'))
    }
  }

  // 重新开始游戏
  const handleRestartGame = () => {
    console.log('🔄 请求重新开始游戏')
    try {
      socket.startGame({ roomId: room?.id })
      setWinner(null)
      setShowVictoryModal(false)
    } catch (error) {
      console.error('重新开始游戏失败:', error)
      toast.error(t('error.restartGame', '重新开始失败，请重试'))
    }
  }

  // 离开房间
  const handleLeaveRoom = () => {
    console.log('🚪 请求离开房间')
    if (!room?.id) return

    // 防止重复离开
    if (isLeavingRef.current) {
      console.warn('已在离开过程中')
      return
    }

    isLeavingRef.current = true
    clearRoom()

    try {
      socket.leaveRoom()
    } catch (error) {
      console.error('离开房间失败:', error)
    }

    const timer = setTimeout(() => {
      router.replace('/')
      timersRef.current.delete(timer)
    }, ANIMATION_DELAYS.EXIT_DELAY)
    timersRef.current.add(timer)
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
        currentPlayer={currentPlayer as any}
        currentPlayerIndex={currentPlayerIndex}
        boardPath={boardPath}
        diceValue={currentDiceValue || 0}
        isRolling={isRolling}
        isMoving={isMoving}
        showVictoryModal={showVictoryModal}
        winner={winner}
        onDiceRoll={handleDiceRollClick}
        onResetGame={handleRestartGame}
        onExit={handleLeaveRoom}
        colors={colors}
        onCloseWinner={() => {
          setWinner(null)
          setShowVictoryModal(false)
        }}
        t={t}
        isOwnTurn={isOwnTurn}
        isHost={isHost}
        diceAnimatedStyle={diceAnimatedStyle}
      />

      {/* 🐾 执行者任务弹窗 */}
      {taskModalData && showTaskModal && currentExecutorTask && (
        <ExecutorTaskModal
          visible={showTaskModal}
          executorTask={currentExecutorTask}
          taskType={taskModalData.type}
          difficulty={taskModalData.difficulty}
          onComplete={handleTaskComplete}
          onClose={() => setShowTaskModal(false)}
        />
      )}

      {/* 🐾 观察者任务弹窗 */}
      {taskModalData && showObserverModal && (
        <ObserverTaskModal
          visible={showObserverModal}
          task={taskModalData}
          onClose={() => setShowObserverModal(false)}
        />
      )}
    </>
  )
}
