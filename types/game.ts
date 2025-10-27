import { LocalPlayer } from '@/types/player'

export interface PathCell {
  id: number
  x: number
  y: number
  type: 'start' | 'end' | 'star' | 'trap' | 'path'
  direction: 'right' | 'down' | 'left' | 'up' | null
}

// 重新导出 LocalPlayer 作为 Player，保持向后兼容
export type Player = LocalPlayer

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'ended'
  mode: 'single' | 'multi'
  currentPlayer: number
  players: Player[]
  board: PathCell[]
  diceValue: number
  round: number
  timeLeft: number
}
