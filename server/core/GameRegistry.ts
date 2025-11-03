import type { Room, SocketIOServer } from '../typings/socket'
import type BaseGame from './BaseGame.js'

interface GameConstructor {
  new (room: Room, io: SocketIOServer): BaseGame
}

class GameRegistry {
  private registry: Map<string, GameConstructor>

  constructor() {
    this.registry = new Map()
  }

  registerGame(type: string, gameClass: GameConstructor): void {
    console.log(`注册游戏类型: ${type}`)
    this.registry.set(type, gameClass)
  }

  createGame(type: string, room: Room, io: SocketIOServer): BaseGame | null {
    const GameClass = this.registry.get(type)
    if (!GameClass) {
      console.error(`未找到游戏类型: ${type}`)
      return null
    }
    return new GameClass(room, io)
  }

  getRegisteredGames(): string[] {
    return Array.from(this.registry.keys())
  }
}

// 导出单例
const gameRegistry = new GameRegistry()
export default gameRegistry
