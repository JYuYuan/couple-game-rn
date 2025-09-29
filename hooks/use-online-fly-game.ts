import { useEffect, useState } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { LANRoom, OnlineRoom } from '@/types/online'
import { useDebounceEffect } from 'ahooks'
import { useSettingsStore } from '@/store'
import { useRouter } from 'expo-router'

export const useOnlineFlyGame = () => {
  const socket = useSocket()
  const router = useRouter()
  const { playerId } = useSettingsStore()
  // 仅保留房间和游戏状态，移除玩家状态管理
  const [room, setRoom] = useState<OnlineRoom | LANRoom | null>(null)
  const [isGameReady, setIsGameReady] = useState(false)
  const [isWaitingForPlayers, setIsWaitingForPlayers] = useState(true)
  // 连接Socket - 只在挂载时连接一次
  useEffect(() => {
    if (!socket.isConnected) {
      console.log('use-online-game: Connecting socket...')
      socket.connect()
    }
  }, []) // 移除依赖，只在组件挂载时执行一次

  // 自动加载房间信息 - 直接依赖 socket.currentRoom 变化
  useDebounceEffect(() => {
    // 当 socket.currentRoom 发生变化时，同步到本地 room 状态
    if (socket.currentRoom) {
      setRoom(socket.currentRoom)

      // 检查是否正在等待玩家
      const hasEnoughPlayers = socket.currentRoom.players.length >= 2
      const allPlayersConnected = socket.currentRoom.players.every((p: any) => p.isConnected)
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
      router.back()
      console.log('⏳ use-online-game: No room data to sync')
    }
  }, [socket.currentRoom])

  return {
    // 连接状态
    isConnected: socket.isConnected,
    connectionError: socket.connectionError,

    // 房间状态
    room,
    isGameReady,
    isWaitingForPlayers,
    isOwnTurn: room?.currentUser === playerId,
    currentPlayer: room?.players.find((item) => item.id === room?.currentUser),
    currentPlayerIndex: room?.players.findIndex((item) => item.id === room?.currentUser),
    isHost: socket.isHost,
    players: room?.players || [],
    boardPath: room?.boardPath || [],
    taskSet: room?.taskSet,
    // 从 gameState 中获取骰子值
    diceValue: room?.gameState?.lastDiceRoll?.diceValue,
    // 从 gameState 中获取当前任务
    currentTask: room?.gameState?.currentTask,
    // 从 gameState 中获取胜利信息
    winner: room?.gameState?.winner,
    // 游戏数据
    gameStatus: room?.gameStatus || 'waiting',
    // Socket引用
    socket,
  }
}
