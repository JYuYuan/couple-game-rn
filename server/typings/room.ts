import type { TaskSet } from './tasks'

export interface CreateRoomData {
  roomName: string
  playerName: string
  maxPlayers: number
  gameType: 'fly' | 'wheel' | 'minesweeper'
  taskSet?: TaskSet | null
}
