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

type RoomStoreType = () => RoomState
let roomStoreInstance: RoomStoreType | null = null

export const useRoomStore = (() => {
  if (roomStoreInstance) {
    return roomStoreInstance
  }

  roomStoreInstance = create<RoomState>()(
    persist(
      (set) => ({
        currentRoom: null,

        setCurrentRoom: (room) => set({ currentRoom: room }),

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
