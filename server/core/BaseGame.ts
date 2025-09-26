import type { SocketIOServer } from '../typings/socket'
import type { Room } from '../typings/socket'

class BaseGame {
  room: Room
  socket: SocketIOServer
  gameState: string = 'idle'
  currentPlayerIndex: number = 0
  playerPositions: { [key: string]: number } = {}
  boardPath: any[] = []
  boardSize: number = 0

  constructor(room: Room, io: SocketIOServer) {
    this.room = room
    this.socket = io
  }

  onStart(io?: SocketIOServer) {}

  onPlayerAction(io: SocketIOServer, playerId: string, action: any) {}

  onEnd(io?: SocketIOServer) {}

  _handleTaskComplete(playerId: string, action: any) {}
}

export default BaseGame;
