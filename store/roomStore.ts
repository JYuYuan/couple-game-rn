import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getStorage } from '@/utils/storage'
import { BaseRoom, LANRoom, OnlineRoom } from '@/types/online'

interface RoomState {
  currentRoom: OnlineRoom | LANRoom | null

  setCurrentRoom: (room: OnlineRoom | LANRoom | null) => void
  updateRoom: (updates: Partial<BaseRoom>) => void
  clearRoom: () => void
}

/**
 * 深度比较两个房间对象是否相等
 * 只比较关键字段，避免不必要的更新
 */
function roomsAreEqual(
  room1: OnlineRoom | LANRoom | null,
  room2: OnlineRoom | LANRoom | null,
): boolean {
  // 都是 null
  if (room1 === null && room2 === null) return true
  // 一个是 null，一个不是
  if (room1 === null || room2 === null) return false

  // 比较基本字段
  if (
    room1.id !== room2.id ||
    room1.gameStatus !== room2.gameStatus ||
    room1.currentUser !== room2.currentUser ||
    room1.hostId !== room2.hostId ||
    room1.isHost !== room2.isHost
  ) {
    return false
  }

  // 比较玩家数组
  if (room1.players.length !== room2.players.length) {
    return false
  }

  // 比较每个玩家的关键字段
  for (let i = 0; i < room1.players.length; i++) {
    const p1 = room1.players[i]
    const p2 = room2.players[i]

    if (
      p1.id !== p2.id ||
      p1.name !== p2.name ||
      p1.position !== p2.position ||
      p1.isConnected !== p2.isConnected ||
      p1.isHost !== p2.isHost
    ) {
      return false
    }
  }

  // 比较游戏状态（如果存在）
  if (room1.gameState && room2.gameState) {
    if (
      room1.gameState.gamePhase !== room2.gameState.gamePhase ||
      room1.gameState.turnCount !== room2.gameState.turnCount
    ) {
      return false
    }

    // 比较玩家位置
    const positions1 = room1.gameState.playerPositions || {}
    const positions2 = room2.gameState.playerPositions || {}
    const keys1 = Object.keys(positions1)
    const keys2 = Object.keys(positions2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      if (positions1[key] !== positions2[key]) {
        return false
      }
    }
  } else if (room1.gameState !== room2.gameState) {
    // 一个有 gameState，一个没有
    return false
  }

  // 所有关键字段都相等
  return true
}

type RoomStoreType = () => RoomState
let roomStoreInstance: RoomStoreType | null = null

export const useRoomStore = (() => {
  if (roomStoreInstance) {
    return roomStoreInstance
  }

  roomStoreInstance = create<RoomState>()(
    persist(
      (set, get) => ({
        currentRoom: null,

        setCurrentRoom: (room) => {
          const currentRoom = get().currentRoom
          console.log(currentRoom, room)
          // 深度比较，只在数据真正改变时才更新
          if (roomsAreEqual(currentRoom, room)) {
            console.log('🟢 [RoomStore] 房间数据未变化，跳过更新')
            return
          }

          console.log('🔄 [RoomStore] 房间数据已变化，执行更新')
          console.log(
            '🐛 [RoomStore] 旧房间:',
            currentRoom
              ? `${currentRoom.id} (${currentRoom.players?.length} 玩家, status: ${currentRoom.gameStatus})`
              : 'null',
          )
          console.log(
            '🐛 [RoomStore] 新房间:',
            room ? `${room.id} (${room.players?.length} 玩家, status: ${room.gameStatus})` : 'null',
          )

          set({ currentRoom: room })
          console.log('✅ [RoomStore] currentRoom 状态已更新')
        },

        updateRoom: (updates) =>
          set((state) => ({
            currentRoom: state.currentRoom ? { ...state.currentRoom, ...updates } : null,
          })),

        clearRoom: () => set({ currentRoom: null }),
      }),
      {
        name: 'room-storage',
        storage: createJSONStorage(() => getStorage()),
        partialize: (state) => ({
          currentRoom: state.currentRoom,
        }),
      },
    ),
  )

  return roomStoreInstance
})()
