#!/usr/bin/env node

// 游戏模拟器命令行工具
import GameSimulator from "./game-simulator.js"
import readline from "readline";

class SimulatorCLI {
  constructor() {
    this.simulator = null
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    this.commands = {
      help: this.showHelp.bind(this),
      start: this.startSimulation.bind(this),
      join: this.joinRoom.bind(this),
      stop: this.stopSimulation.bind(this),
      status: this.showStatus.bind(this),
      'add-bot': this.addBot.bind(this),
      'remove-bot': this.removeBot.bind(this),
      'auto-on': this.enableAutoPlay.bind(this),
      'auto-off': this.disableAutoPlay.bind(this),
      'auto-dice': this.enableAutoDice.bind(this),
      'auto-task': this.enableAutoTask.bind(this),
      manual: this.disableAllAuto.bind(this),
      dice: this.rollDice.bind(this),
      task: this.completeTask.bind(this),
      config: this.showConfig.bind(this),
      quit: this.quit.bind(this),
      exit: this.quit.bind(this),
    }

    console.log('🎮 飞行棋游戏模拟器')
    console.log('输入 "help" 查看可用命令')
    this.promptUser()
  }

  promptUser() {
    this.rl.question('> ', (input) => {
      this.processCommand(input.trim())
    })
  }

  async processCommand(input) {
    const [command, ...args] = input.split(' ')
    const handler = this.commands[command.toLowerCase()]

    if (handler) {
      try {
        await handler(args)
      } catch (error) {
        console.error('❌ 命令执行错误:', error.message)
      }
    } else if (input) {
      console.log('❓ 未知命令. 输入 "help" 查看可用命令')
    }

    this.promptUser()
  }

  showHelp() {
    console.log(`
📖 可用命令:

基本操作:
  help                    - 显示此帮助信息
  start [players] [type]  - 创建房间并开始游戏模拟 (默认: 2个玩家, fly类型)
  join <roomId> [players] - 加入指定房间 (默认: 1个机器人)
  stop                    - 停止游戏模拟
  status                  - 显示当前状态
  config                  - 显示配置信息

机器人管理:
  add-bot [name]          - 添加机器人到当前游戏
  remove-bot <name>       - 移除指定机器人

自动游戏控制:
  auto-on                 - 启用所有机器人完全自动游戏
  auto-off                - 禁用所有机器人自动游戏
  auto-dice               - 只启用自动摇骰子
  auto-task               - 只启用自动完成任务
  manual                  - 完全手动模式

手动操作:
  dice [botName]          - 手动摇骰子 (不指定名称则随机选择)
  task [botName] [result] - 手动完成任务 (result: true/false, 默认true)

退出:
  quit, exit              - 退出程序

示例:
  start 3 fly             - 创建3个机器人玩飞行棋
  join ABC123 2           - 2个机器人加入房间ABC123
  auto-dice               - 只自动摇骰子，任务手动完成
  dice Bot_Player_1       - 让Bot_Player_1摇骰子
  task Bot_Player_1 true  - 让Bot_Player_1完成任务(成功)
        `)
  }

  async startSimulation(args) {
    if (this.simulator) {
      console.log('⚠️ 游戏模拟已在运行中，请先停止当前模拟')
      return
    }

    const playersCount = parseInt(args[0]) || 2
    const gameType = args[1] || 'fly'

    if (playersCount < 2 || playersCount > 4) {
      console.log('❌ 玩家数量必须在2-4之间')
      return
    }

    if (!['fly', 'wheel', 'minesweeper'].includes(gameType)) {
      console.log('❌ 游戏类型必须是: fly, wheel, minesweeper')
      return
    }

    console.log(`🚀 开始游戏模拟: ${playersCount}个玩家, 游戏类型: ${gameType}`)

    const config = {
      mode: 'create',
      playersCount,
      gameType,
      taskSetId: 'default',
      autoStart: true,
      roomName: `CLI_Room_${Date.now()}`,
    }

    this.simulator = new GameSimulator(config)

    try {
      const result = await this.simulator.startSimulation()
      console.log('✅ 游戏模拟启动成功!')
      console.log(`🏠 房间ID: ${result.roomId}`)
      console.log(`🤖 机器人数量: ${result.bots.length}`)
    } catch (error) {
      console.error('❌ 启动失败:', error.message)
      this.simulator = null
    }
  }

  async joinRoom(args) {
    if (this.simulator) {
      console.log('⚠️ 游戏模拟已在运行中，请先停止当前模拟')
      return
    }

    const roomId = args[0]
    const playersCount = parseInt(args[1]) || 1

    if (!roomId) {
      console.log('❌ 请指定要加入的房间ID')
      return
    }

    if (playersCount < 1 || playersCount > 4) {
      console.log('❌ 机器人数量必须在1-4之间')
      return
    }

    console.log(`🚪 加入房间: ${roomId}, 机器人数量: ${playersCount}`)

    const config = {
      mode: 'join',
      targetRoomId: roomId,
      playersCount,
      autoStart: false,
    }

    this.simulator = new GameSimulator(config)

    try {
      const result = await this.simulator.startSimulation()
      console.log('✅ 成功加入房间!')
      console.log(`🏠 房间ID: ${result.roomId}`)
      console.log(`🤖 机器人数量: ${result.bots.length}`)
    } catch (error) {
      console.error('❌ 加入房间失败:', error.message)
      this.simulator = null
    }
  }

  async stopSimulation() {
    if (!this.simulator) {
      console.log('⚠️ 没有正在运行的游戏模拟')
      return
    }

    await this.simulator.stopSimulation()
    this.simulator = null
    console.log('✅ 游戏模拟已停止')
  }

  showStatus() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const status = this.simulator.getStatus()
    console.log(`
📊 当前状态:
🎯 模式: ${status.mode === 'create' ? '创建房间' : '加入房间'}
🏠 房间ID: ${status.roomId}
🤖 机器人数量: ${status.botsCount}
🎮 游戏类型: ${status.gameConfig.gameType}

机器人列表:`)

    status.bots.forEach((bot, index) => {
      const turnIndicator = bot.isMyTurn ? '🎯' : '⏳'
      const connectionStatus = bot.connected ? '🟢' : '🔴'
      console.log(
        `  ${index + 1}. ${connectionStatus} ${bot.playerName} ${turnIndicator} (${bot.playerId})`,
      )
    })
  }

  async addBot(args) {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const botName = args[0]
    try {
      const bot = await this.simulator.addBot(botName)
      console.log(`✅ 机器人 ${bot.playerName} 已添加到游戏`)
    } catch (error) {
      console.error('❌ 添加机器人失败:', error.message)
    }
  }

  removeBot(args) {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const botName = args[0]
    if (!botName) {
      console.log('❌ 请指定要移除的机器人名称')
      return
    }

    try {
      this.simulator.removeBot(botName)
      console.log(`✅ 机器人 ${botName} 已移除`)
    } catch (error) {
      console.error('❌ 移除机器人失败:', error.message)
    }
  }

  enableAutoPlay() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    this.simulator.setAutoPlay(true)
    console.log('✅ 所有机器人自动游戏已启用')
  }

  disableAutoPlay() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    this.simulator.setAutoPlay(false)
    console.log('✅ 所有机器人自动游戏已禁用')
  }

  enableAutoDice() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    this.simulator.setAutoDice(true)
    this.simulator.setAutoTask(false)
    console.log('✅ 自动摇骰子已启用，自动完成任务已禁用')
  }

  enableAutoTask() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    this.simulator.setAutoDice(false)
    this.simulator.setAutoTask(true)
    console.log('✅ 自动完成任务已启用，自动摇骰子已禁用')
  }

  disableAllAuto() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    this.simulator.setAutoDice(false)
    this.simulator.setAutoTask(false)
    console.log('✅ 所有自动功能已禁用，切换到完全手动模式')
  }

  rollDice(args) {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const botName = args[0]
    try {
      if (botName) {
        const result = this.simulator.rollDiceForBot(botName)
        if (result) {
          console.log(`🎲 ${botName} 摇骰子: ${result.diceValue}`)
        } else {
          console.log(`❌ 机器人 ${botName} 不存在或不是当前回合`)
        }
      } else {
        const result = this.simulator.rollDiceForCurrentBot()
        if (result) {
          console.log(`🎲 ${result.botName} 摇骰子: ${result.diceValue}`)
        } else {
          console.log(`❌ 当前没有可操作的机器人`)
        }
      }
    } catch (error) {
      console.error('❌ 摇骰子失败:', error.message)
    }
  }

  completeTask(args) {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const botName = args[0]
    const result = args[1] !== 'false' // 默认为true，只有明确指定false才是false

    try {
      if (botName) {
        const success = this.simulator.completeTaskForBot(botName, result)
        if (success) {
          console.log(`✅ ${botName} 完成任务: ${result ? '成功' : '失败'}`)
        } else {
          console.log(`❌ 机器人 ${botName} 不存在或当前没有任务`)
        }
      } else {
        const success = this.simulator.completeTaskForCurrentBot(result)
        if (success) {
          console.log(`✅ 当前机器人完成任务: ${result ? '成功' : '失败'}`)
        } else {
          console.log(`❌ 当前没有需要完成任务的机器人`)
        }
      }
    } catch (error) {
      console.error('❌ 完成任务失败:', error.message)
    }
  }

  showConfig() {
    if (!this.simulator) {
      console.log('❌ 没有正在运行的游戏模拟')
      return
    }

    const config = this.simulator.gameConfig
    console.log(`
⚙️ 游戏配置:
👥 玩家数量: ${config.playersCount}
🎮 游戏类型: ${config.gameType}
📋 任务集ID: ${config.taskSetId}
🚀 自动开始: ${config.autoStart ? '是' : '否'}
🏠 房间名称: ${config.roomName}
        `)
  }

  async quit() {
    console.log('👋 正在退出...')

    if (this.simulator) {
      await this.simulator.stopSimulation()
    }

    this.rl.close()
    process.exit(0)
  }
}

// 命令行参数处理
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {}

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '')
    const value = args[i + 1]
    if (key && value) {
      options[key] = value
    }
  }

  return options
}

// 显示使用说明
function showUsage() {
  console.log(`
🎮 飞行棋游戏模拟器 CLI

用法:
  node simulator-cli.js                    - 启动交互式命令行
  node simulator-cli.js --quick            - 快速启动2人游戏
  node simulator-cli.js --players 3        - 快速启动3人游戏
  node simulator-cli.js --type wheel       - 快速启动转盘游戏
  node simulator-cli.js --join <roomId>    - 加入指定房间
  node simulator-cli.js --join <roomId> --bots 2  - 2个机器人加入房间

选项:
  --players <number>    玩家数量 (2-4) [创建模式]
  --bots <number>       机器人数量 (1-4) [加入模式]
  --type <type>         游戏类型 (fly/wheel/minesweeper)
  --join <roomId>       加入指定房间ID
  --quick               快速启动模式
  --help                显示此帮助信息
    `)
}

// 主程序
async function main() {
  const options = parseArgs()

  if (options.help) {
    showUsage()
    return
  }

  if (options.join) {
    // 加入房间模式
    const botCount = parseInt(options.bots) || 1

    if (botCount < 1 || botCount > 4) {
      console.error('❌ 机器人数量必须在1-4之间')
      process.exit(1)
    }

    const config = {
      mode: 'join',
      targetRoomId: options.join,
      playersCount: botCount,
      autoStart: false,
    }

    console.log('🚪 加入房间模式')
    console.log('🎯 目标房间:', options.join)
    console.log('🤖 机器人数量:', botCount)

    const simulator = new GameSimulator(config)

    try {
      const result = await simulator.startSimulation()
      console.log('✅ 成功加入房间!')
      console.log(`🏠 房间ID: ${result.roomId}`)
      console.log('📝 输入 Ctrl+C 停止模拟')

      // 监听退出信号
      process.on('SIGINT', async () => {
        console.log('\\n🛑 正在停止模拟...')
        await simulator.stopSimulation()
        process.exit(0)
      })
    } catch (error) {
      console.error('❌ 加入房间失败:', error.message)
      process.exit(1)
    }
  } else if (options.quick || options.players || options.type) {
    // 快速启动模式（创建房间）
    const config = {
      mode: 'create',
      playersCount: parseInt(options.players) || 2,
      gameType: options.type || 'fly',
      taskSetId: 'default',
      autoStart: true,
      roomName: `Quick_Room_${Date.now()}`,
    }

    console.log('🚀 快速启动模式')
    console.log('⚙️ 配置:', config)

    const simulator = new GameSimulator(config)

    try {
      const result = await simulator.startSimulation()
      console.log('✅ 游戏模拟启动成功!')
      console.log(`🏠 房间ID: ${result.roomId}`)
      console.log('📝 输入 Ctrl+C 停止模拟')

      // 监听退出信号
      process.on('SIGINT', async () => {
        console.log('\\n🛑 正在停止模拟...')
        await simulator.stopSimulation()
        process.exit(0)
      })
    } catch (error) {
      console.error('❌ 启动失败:', error.message)
      process.exit(1)
    }
  } else {
    // 交互式模式
    new SimulatorCLI()
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error)
  process.exit(1)
})

// 启动程序
 main().catch(console.error)
