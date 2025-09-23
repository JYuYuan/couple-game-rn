import { useCallback, useEffect, useState } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { useGameTasks } from '@/hooks/use-game-tasks'
import {
  DiceRollData,
  OnlinePlayer,
  OnlineRoom,
  LANRoom,
  NetworkPlayer,
  PlayerMoveData,
  TaskCompleteData,
  TaskTriggerData,
} from '@/types/online'

interface OnlineGameConfig {
  roomId?: string // 可选的房间ID，如果没有提供则自动创建
  taskSetId: string
  gameType: 'fly' | 'wheel' | 'minesweeper'
  autoCreate?: boolean // 是否自动创建房间
  playerName?: string // 玩家名称
  onPlayerMoveReceived?: (data: PlayerMoveData) => void
  onTaskTriggerReceived?: (data: TaskTriggerData) => void
  onTaskCompleteReceived?: (data: TaskCompleteData) => void
  onGameStartReceived?: () => void
}

export const useOnlineGame = (config: OnlineGameConfig) => {
  const {
    onPlayerMoveReceived,
    onTaskTriggerReceived,
    onTaskCompleteReceived,
    onGameStartReceived,
  } = config
  const socket = useSocket()
  const gameTasks = useGameTasks(config.taskSetId)

  // 支持在线和局域网的游戏状态
  const [room, setRoom] = useState<OnlineRoom | LANRoom | null>(null)
  const [isGameReady, setIsGameReady] = useState(false)
  const [syncedDiceValue, setSyncedDiceValue] = useState(0)
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(true)

  // 连接Socket并加入房间
  useEffect(() => {
    console.log('use-online-game: Socket connection check - isConnected:', socket.isConnected)
    if (!socket.isConnected) {
      console.log('use-online-game: Connecting to socket...')
      socket.connect()
    } else {
      console.log('use-online-game: Socket already connected, no need to connect')
    }
  }, [socket])

  // 自动加载房间信息 - 直接依赖 socket.currentRoom 变化
  useEffect(() => {
    console.log('🔄 use-online-game: socket.currentRoom useEffect triggered:', {
      socketCurrentRoom: socket.currentRoom?.id,
      socketCurrentRoomData: socket.currentRoom,
      localRoom: room?.id,
      socketConnected: socket.isConnected,
      deps: [socket.currentRoom, socket.isConnected, room],
    })

    // 当 socket.currentRoom 发生变化时，同步到本地 room 状态
    if (socket.currentRoom) {
      console.log('✅ use-online-game: Syncing room from socket.currentRoom:', socket.currentRoom)
      setRoom(socket.currentRoom)

      // 检查是否正在等待玩家
      const hasEnoughPlayers = socket.currentRoom.players.length >= 2
      const allPlayersConnected = socket.currentRoom.players.every((p) => p.isConnected)
      const gameNotStarted = socket.currentRoom.gameStatus === 'waiting'

      setIsWaitingForPlayers(!hasEnoughPlayers || !allPlayersConnected || gameNotStarted)

      // 检查游戏状态
      setIsGameReady(socket.currentRoom.gameStatus === 'playing')
    } else if (!socket.currentRoom && room) {
      // 如果 socket.currentRoom 被清除了，也清除本地 room
      console.log('🗑️ use-online-game: socket.currentRoom cleared, clearing local room')
      setRoom(null)
      setIsWaitingForPlayers(true)
      setIsGameReady(false)
    } else {
      console.log('⏳ use-online-game: No room data to sync')
    }
  }, [socket.currentRoom, socket.isConnected])

  // 移除重复的房间更新监听器，直接依赖 socket.currentRoom

  // 监听游戏事件
  useEffect(() => {
    // 监听骰子投掷
    const handleDiceRoll = (data: DiceRollData) => {
      console.log('Dice rolled by player:', data)
      setSyncedDiceValue(data.diceValue)

      // 如果不是当前玩家投掷的，播放音效
      if (data.playerId !== socket.currentPlayer?.id) {
        // 可以添加其他玩家投掷的提示音效
      }
    }

    // 监听玩家移动
    const handlePlayerMove = (data: PlayerMoveData) => {
      console.log('Player moved:', data)
      // 触发本地移动动画同步
      onPlayerMoveReceived?.(data)
    }

    // 监听任务触发
    const handleTaskTrigger = (data: TaskTriggerData) => {
      console.log('Task triggered:', data)
      onTaskTriggerReceived?.(data)
    }

    // 监听任务完成
    const handleTaskComplete = (data: TaskCompleteData) => {
      console.log('Task completed:', data)
      onTaskCompleteReceived?.(data)
    }

    // 监听游戏开始
    const handleGameStart = () => {
      console.log('Game started by host')
      setIsWaitingForPlayers(false)
      onGameStartReceived?.()
    }

    // 监听玩家连接/断开
    const handlePlayerConnected = (player: OnlinePlayer) => {
      console.log('Player connected:', player)
      // 房间会通过room:update事件更新
    }

    const handlePlayerDisconnected = (playerId: string) => {
      console.log('Player disconnected:', playerId)
      // 房间会通过room:update事件更新
    }

    socket.addEventListener('game:dice-roll', handleDiceRoll)
    socket.addEventListener('game:player-move', handlePlayerMove)
    socket.addEventListener('game:task-trigger', handleTaskTrigger)
    socket.addEventListener('game:task-complete', handleTaskComplete)
    socket.addEventListener('game:start', handleGameStart)
    socket.addEventListener('player:connected', handlePlayerConnected)
    socket.addEventListener('player:disconnected', handlePlayerDisconnected)

    return () => {
      socket.removeEventListener('game:dice-roll', handleDiceRoll)
      socket.removeEventListener('game:player-move', handlePlayerMove)
      socket.removeEventListener('game:task-trigger', handleTaskTrigger)
      socket.removeEventListener('game:task-complete', handleTaskComplete)
      socket.removeEventListener('game:start', handleGameStart)
      socket.removeEventListener('player:connected', handlePlayerConnected)
      socket.removeEventListener('player:disconnected', handlePlayerDisconnected)
    }
  }, [
    socket,
    onPlayerMoveReceived,
    onTaskTriggerReceived,
    onTaskCompleteReceived,
    onGameStartReceived,
  ])

  // 在线游戏操作
  const startOnlineGame = useCallback(() => {
    if (room && socket.isHost) {
      socket.startGame({ roomId: room.id })
    }
  }, [room, socket])

  const rollDiceOnline = useCallback(
    (diceValue: number) => {
      if (room && socket.currentPlayer) {
        const data: DiceRollData = {
          roomId: room.id,
          playerId: socket.currentPlayer.id,
          diceValue,
        }
        socket.rollDice(data)
      }
    },
    [room, socket],
  )

  const movePlayerOnline = useCallback(
    (playerId: string, fromPosition: number, toPosition: number, steps: number) => {
      if (room) {
        const data: PlayerMoveData = {
          roomId: room.id,
          playerId,
          fromPosition,
          toPosition,
          steps,
        }
        socket.movePlayer(data)
      }
    },
    [room, socket],
  )

  const triggerTaskOnline = useCallback(
    (
      taskType: 'trap' | 'star' | 'collision',
      triggerPlayerId: string,
      executorPlayerId: string,
      task: any,
    ) => {
      if (room) {
        const data: TaskTriggerData = {
          roomId: room.id,
          taskType,
          triggerPlayerId,
          executorPlayerId,
          task,
        }
        socket.triggerTask(data)
      }
    },
    [room, socket],
  )

  const completeTaskOnline = useCallback(
    (taskId: string, playerId: string, completed: boolean, rewardSteps?: number) => {
      if (room) {
        const data: TaskCompleteData = {
          roomId: room.id,
          taskId,
          playerId,
          completed,
          rewardSteps,
        }
        socket.completeTask(data)
      }
    },
    [room, socket],
  )

  const leaveRoom = useCallback(() => {
    console.log('useOnlineGame: leaving room')
    socket.leaveRoom()
    socket.resetRoomState() // 重置Socket房间状态
    setRoom(null)
    setIsGameReady(false)
    setIsWaitingForPlayers(true)
  }, [socket])

  // 获取当前玩家
  const getCurrentPlayer = useCallback((): NetworkPlayer | null => {
    if (!room || !socket.currentPlayer) return null
    // 根据连接类型使用不同的查找方式
    if (socket.connectionType === 'lan') {
      return room.players.find((p) => p.id === socket.currentPlayer?.id) || null
    } else {
      // 在线模式
      const onlinePlayer = socket.currentPlayer as OnlinePlayer
      return (
        room.players.find((p) => (p as OnlinePlayer).socketId === onlinePlayer.socketId) || null
      )
    }
  }, [room, socket.currentPlayer, socket.connectionType])

  // 获取当前玩家索引
  const getCurrentPlayerIndex = useCallback((): number => {
    if (!room) return 0
    return room.currentPlayerIndex
  }, [room])

  // 检查是否轮到当前玩家
  const isCurrentPlayerTurn = useCallback((): boolean => {
    if (!room || !socket.currentPlayer) return false
    const currentTurnPlayer = room.players[room.currentPlayerIndex]

    // 根据连接类型使用不同的比较方式
    if (socket.connectionType === 'lan') {
      return currentTurnPlayer?.id === socket.currentPlayer.id
    } else {
      // 在线模式
      const onlinePlayer = socket.currentPlayer as OnlinePlayer
      return (currentTurnPlayer as OnlinePlayer)?.socketId === onlinePlayer.socketId
    }
  }, [room, socket.currentPlayer, socket.connectionType])

  // 获取房间信息
  const getRoomInfo = useCallback(() => {
    const roomInfo = {
      id: room?.id || '',
      name: room?.name || '',
      playerCount: room?.players.length || 0,
      maxPlayers: room?.maxPlayers || 2,
      hostName: room?.players.find((p) => p.isHost)?.name || '',
      isHost: socket.isHost,
    }

    console.log('getRoomInfo called:', {
      room: room,
      socketCurrentRoom: socket.currentRoom,
      socketIsHost: socket.isHost,
      roomInfo: roomInfo,
    })

    return roomInfo
  }, [room, socket.isHost, socket.currentRoom])

  return {
    // 连接状态
    isConnected: socket.isConnected,
    connectionError: socket.connectionError,

    // 房间状态
    room,
    isGameReady,
    isWaitingForPlayers,

    // 玩家信息
    currentPlayer: getCurrentPlayer(),
    currentPlayerIndex: getCurrentPlayerIndex(),
    isCurrentPlayerTurn: isCurrentPlayerTurn(),
    isHost: socket.isHost,
    players: room?.players || [],

    // 游戏数据
    syncedDiceValue,
    gameStatus: room?.gameStatus || 'waiting',
    roomInfo: getRoomInfo(),

    // 游戏操作
    startOnlineGame,
    rollDiceOnline,
    movePlayerOnline,
    triggerTaskOnline,
    completeTaskOnline,
    leaveRoom,

    // 任务系统
    gameTasks,

    // Socket引用
    socket,
  }
}
