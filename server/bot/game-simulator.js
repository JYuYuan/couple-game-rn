// 游戏模拟器 - 管理多个机器人玩家进行游戏
import BotPlayer from "./bot-player.js"

class GameSimulator {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:3001'
    this.bots = []
    this.currentRoomId = null
    this.mode = options.mode || 'create' // 'create' 或 'join'
    this.targetRoomId = options.targetRoomId || null // 要加入的房间ID
    this.gameConfig = {
      playersCount: options.playersCount || 2,
      taskSetId: options.taskSetId || 'default',
      gameType: options.gameType || 'fly',
      autoStart: options.autoStart !== false,
      roomName: options.roomName || `Bot_Room_${Date.now()}`,
    }

    console.log('🎮 游戏模拟器已创建')
    console.log('🎯 模式:', this.mode === 'create' ? '创建房间' : '加入房间')
    if (this.mode === 'join') {
      console.log('🏠 目标房间ID:', this.targetRoomId)
    }
    console.log('⚙️ 配置:', this.gameConfig)
  }

  // 创建指定数量的机器人玩家
  async createBots(count = this.gameConfig.playersCount) {
    console.log(`🤖 正在创建 ${count} 个机器人玩家...`)

    const createPromises = []
    for (let i = 0; i < count; i++) {
      const botOptions = {
        serverUrl: this.serverUrl,
        playerName: `Bot_Player_${i + 1}`,
        autoPlay: true,
        diceDelay: 1500 + Math.random() * 1000, // 1.5-2.5秒随机延迟
        taskDelay: 1000 + Math.random() * 500, // 1-1.5秒随机延迟
      }

      const bot = new BotPlayer(botOptions)
      this.bots.push(bot)
      createPromises.push(bot.connect())
    }

    try {
      await Promise.all(createPromises)
      console.log(`✅ 所有 ${count} 个机器人玩家已连接`)
      return this.bots
    } catch (error) {
      console.error('❌ 创建机器人玩家时出错:', error)
      throw error
    }
  }

  // 开始游戏模拟
  async startSimulation() {
    try {
      console.log('🚀 开始游戏模拟...')

      // 创建机器人玩家
      await this.createBots()

      if (this.bots.length === 0) {
        throw new Error('没有可用的机器人玩家')
      }

      if (this.mode === 'create') {
        // 创建房间模式
        return await this.startCreateMode()
      } else if (this.mode === 'join') {
        // 加入房间模式
        return await this.startJoinMode()
      } else {
        throw new Error(`未知模式: ${this.mode}`)
      }
    } catch (error) {
      console.error('❌ 游戏模拟启动失败:', error)
      throw error
    }
  }

  // 创建房间模式
  async startCreateMode() {
    console.log('🏗️ 启动创建房间模式...')

    const hostBot = this.bots[0]
    console.log(`👑 ${hostBot.playerName} 将作为房主创建房间`)

    const room = await hostBot.createRoom(
      this.gameConfig.roomName,
      this.gameConfig.playersCount,
      this.gameConfig.taskSetId,
      this.gameConfig.gameType,
    )

    this.currentRoomId = room.id
    console.log(`🏠 房间创建成功: ${this.currentRoomId}`)

    // 其他机器人加入房间
    if (this.bots.length > 1) {
      console.log('🚪 其他机器人加入房间...')
      const joinPromises = this.bots
        .slice(1)
        .map((bot) => this.delayedJoin(bot, this.currentRoomId, Math.random() * 2000))

      await Promise.all(joinPromises)
      console.log('✅ 所有机器人都已加入房间')
    }

    // 等待一段时间后开始游戏
    if (this.gameConfig.autoStart) {
      setTimeout(() => {
        console.log('🎮 房主启动游戏...')
        hostBot.startGame()
      }, 3000)
    }

    return {
      roomId: this.currentRoomId,
      bots: this.bots.map((bot) => bot.getStatus()),
      mode: 'create',
    }
  }

  // 加入房间模式
  async startJoinMode() {
    if (!this.targetRoomId) {
      throw new Error('加入模式需要指定房间ID')
    }

    console.log(`🚪 启动加入房间模式，目标房间: ${this.targetRoomId}`)

    // 所有机器人都加入指定房间
    console.log('🤖 所有机器人加入房间...')
    const joinPromises = this.bots.map(
      (bot, index) => this.delayedJoin(bot, this.targetRoomId, index * 1000), // 每个机器人间隔1秒加入
    )

    try {
      await Promise.all(joinPromises)
      this.currentRoomId = this.targetRoomId
      console.log('✅ 所有机器人都已加入房间')

      return {
        roomId: this.currentRoomId,
        bots: this.bots.map((bot) => bot.getStatus()),
        mode: 'join',
      }
    } catch (error) {
      console.error('❌ 机器人加入房间失败:', error)
      throw error
    }
  }

  // 延迟加入房间
  async delayedJoin(bot, roomId, delay) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          await bot.joinRoom(roomId)
          resolve()
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }

  // 停止模拟
  async stopSimulation() {
    console.log('🛑 停止游戏模拟...')

    for (const bot of this.bots) {
      try {
        bot.leaveRoom()
        bot.disconnect()
      } catch (error) {
        console.warn(`⚠️ 断开 ${bot.playerName} 时出错:`, error.message)
      }
    }

    this.bots = []
    this.currentRoomId = null
    console.log('✅ 游戏模拟已停止')
  }

  // 获取当前状态
  getStatus() {
    return {
      roomId: this.currentRoomId,
      botsCount: this.bots.length,
      bots: this.bots.map((bot) => bot.getStatus()),
      gameConfig: this.gameConfig,
      mode: this.mode,
      targetRoomId: this.targetRoomId,
    }
  }

  // 添加新的机器人到现有游戏
  async addBot(botName = null) {
    if (!this.currentRoomId) {
      throw new Error('没有活跃的房间')
    }

    const botOptions = {
      serverUrl: this.serverUrl,
      playerName: botName || `Bot_Player_${this.bots.length + 1}`,
      autoPlay: true,
    }

    const bot = new BotPlayer(botOptions)
    await bot.connect()
    await bot.joinRoom(this.currentRoomId)

    this.bots.push(bot)
    console.log(`✅ 新机器人 ${bot.playerName} 已加入游戏`)

    return bot
  }

  // 移除机器人
  removeBot(botName) {
    const botIndex = this.bots.findIndex((bot) => bot.playerName === botName)
    if (botIndex === -1) {
      throw new Error(`找不到名为 ${botName} 的机器人`)
    }

    const bot = this.bots[botIndex]
    bot.leaveRoom()
    bot.disconnect()

    this.bots.splice(botIndex, 1)
    console.log(`🗑️ 机器人 ${botName} 已移除`)
  }

  // 设置为加入房间模式
  setJoinMode(roomId, playersCount = 2) {
    if (!roomId) {
      throw new Error('房间ID不能为空')
    }

    this.mode = 'join'
    this.targetRoomId = roomId
    this.gameConfig.playersCount = playersCount
    this.gameConfig.autoStart = false // 加入模式不自动开始游戏

    console.log(`🎯 切换到加入房间模式: ${roomId}`)
    console.log(`👥 将创建 ${playersCount} 个机器人加入房间`)
  }

  // 设置为创建房间模式
  setCreateMode(options = {}) {
    this.mode = 'create'
    this.targetRoomId = null

    // 更新配置
    if (options.playersCount) this.gameConfig.playersCount = options.playersCount
    if (options.gameType) this.gameConfig.gameType = options.gameType
    if (options.roomName) this.gameConfig.roomName = options.roomName
    if (options.autoStart !== undefined) this.gameConfig.autoStart = options.autoStart

    console.log('🏗️ 切换到创建房间模式')
    console.log('⚙️ 配置:', this.gameConfig)
  }

  // 快速加入房间
  static async quickJoinRoom(roomId, options = {}) {
    const config = {
      mode: 'join',
      targetRoomId: roomId,
      playersCount: options.playersCount || 1,
      autoStart: false,
      ...options,
    }

    const simulator = new GameSimulator(config)
    return await simulator.startSimulation()
  }

  // 快速创建房间
  static async quickCreateRoom(options = {}) {
    const config = {
      mode: 'create',
      playersCount: options.playersCount || 2,
      gameType: options.gameType || 'fly',
      autoStart: options.autoStart !== false,
      ...options,
    }

    const simulator = new GameSimulator(config)
    return await simulator.startSimulation()
  }

  // 设置所有机器人的自动游戏状态
  setAutoPlay(enabled) {
    this.bots.forEach((bot) => {
      bot.autoPlay = enabled
      bot.autoDice = enabled
      bot.autoTask = enabled
    })
    console.log(`🎯 所有机器人自动游戏已${enabled ? '启用' : '禁用'}`)
  }

  // 设置自动摇骰子
  setAutoDice(enabled) {
    this.bots.forEach((bot) => {
      bot.autoDice = enabled
    })
    console.log(`🎲 所有机器人自动摇骰子已${enabled ? '启用' : '禁用'}`)
  }

  // 设置自动完成任务
  setAutoTask(enabled) {
    this.bots.forEach((bot) => {
      bot.autoTask = enabled
    })
    console.log(`✅ 所有机器人自动完成任务已${enabled ? '启用' : '禁用'}`)
  }

  // 为指定机器人摇骰子
  rollDiceForBot(botName) {
    const bot = this.bots.find((bot) => bot.playerName === botName)
    if (!bot) {
      return null
    }

    if (!bot.isCurrentPlayerTurn()) {
      console.log(`⚠️ 现在不是 ${botName} 的回合`)
      return null
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    bot.rollDice(diceValue)
    return { diceValue, botName }
  }

  // 为当前轮次的机器人摇骰子
  rollDiceForCurrentBot() {
    const currentBot = this.bots.find((bot) => bot.isCurrentPlayerTurn())
    if (!currentBot) {
      return null
    }

    const diceValue = Math.floor(Math.random() * 6) + 1
    currentBot.rollDice(diceValue)
    return { diceValue, botName: currentBot.playerName }
  }

  // 为指定机器人完成任务
  completeTaskForBot(botName, success = true) {
    const bot = this.bots.find((bot) => bot.playerName === botName)
    if (!bot) {
      return false
    }

    if (!bot.hasCurrentTask()) {
      console.log(`⚠️ ${botName} 当前没有需要完成的任务`)
      return false
    }

    bot.completeTask(success)
    return true
  }

  // 为当前有任务的机器人完成任务
  completeTaskForCurrentBot(success = true) {
    const currentTaskBot = this.bots.find((bot) => bot.hasCurrentTask())
    if (!currentTaskBot) {
      return false
    }

    currentTaskBot.completeTask(success)
    return true
  }

  // 获取当前状态的详细信息
  getDetailedStatus() {
    return {
      roomId: this.currentRoomId,
      botsCount: this.bots.length,
      gameConfig: this.gameConfig,
      mode: this.mode,
      targetRoomId: this.targetRoomId,
      bots: this.bots.map((bot) => ({
        ...bot.getStatus(),
        autoDice: bot.autoDice,
        autoTask: bot.autoTask,
        autoPlay: bot.autoPlay,
        isMyTurn: bot.isCurrentPlayerTurn(),
        hasTask: bot.hasCurrentTask(),
      })),
    }
  }
}

export default GameSimulator
