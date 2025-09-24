class BaseGame {
  constructor(room, io) {
    this.room = room
    this.socket = io
  }

  onStart(io) {}

  onPlayerAction(io, playerId, action) {}

  onEnd(io) {}
}

export default BaseGame;
