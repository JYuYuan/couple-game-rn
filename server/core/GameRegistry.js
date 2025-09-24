class GameRegistry {
  constructor() {
    this.registry = new Map()
  }

  registerGame(type, gameClass) {
    console.log(`注册游戏类型: ${type}`)
    this.registry.set(type, gameClass)
  }

  createGame(type, room, io) {
    const GameClass = this.registry.get(type)
    if (!GameClass) {
      console.error(`未找到游戏类型: ${type}`)
      return null
    }
    return new GameClass(room, io)
  }

  getRegisteredGames() {
    return Array.from(this.registry.keys())
  }
}

// 导出单例
const gameRegistry = new GameRegistry()
export default gameRegistry
