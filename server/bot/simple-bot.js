#!/usr/bin/env node

// 简单机器人 - 自动创建、连接、加入房间、自动游戏
import io from 'socket.io-client'

class SimpleBot {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:3001'
    this.playerName = options.playerName || `Bot_${Math.random().toString(36).substring(2, 6)}`
    this.playerId = Math.random().toString(36).substring(2, 8).toUpperCase()
    this.roomId = options.roomId || null
    this.mode = options.mode || 'create' // 'create' 或 'join'

    this.socket = null
    this.currentRoom = null
    this.isConnected = false
    this.gameStarted = false
    this.isMyTurn = false

    console.log(`🤖 创建机器人: ${this.playerName} (ID: ${this.playerId})`)
  }

  // 连接到服务器
  async connect() {
    console.log(`🔗 连接到服务器: ${this.serverUrl}`)

    this.socket = io(this.serverUrl, {
      query: { playerId: this.playerId },
      transports: ['websocket', 'polling'],
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('连接超时'))
      }, 10000)

      this.socket.on('connect', () => {
        console.log(`✅ ${this.playerName} 连接成功`)
        this.isConnected = true
        clearTimeout(timeout)
        this.setupEventListeners()
        resolve(true)
      })

      this.socket.on('connect_error', (error) => {
        console.error(`❌ ${this.playerName} 连接失败:`, error.message)
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  // 设置事件监听
  setupEventListeners() {
    // 房间更新
    this.socket.on('room:update', (room) => {
      console.log(`📊 ${this.playerName} 收到房间更新:`, room.id)
      this.currentRoom = room
      this.checkGameState()
    })

    // 监听错误
    this.socket.on('error', (error) => {
      console.error(`❌ ${this.playerName} Socket错误:`, error)
    })

    this.socket.on('disconnect', () => {
      console.log(`🔌 ${this.playerName} 断开连接`)
      this.isConnected = false
    })
  }

  // 创建房间
  async createRoom() {
    console.log(`🏠 ${this.playerName} 创建房间...`)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('创建房间超时'))
      }, 10000)

      this.socket.emit(
        'room:create',
        {
          roomName: `Bot_Room_${Date.now()}`,
          playerName: this.playerName,
          maxPlayers: 2,
          gameType: 'fly',
          taskSet: { id: 'default', name: '默认任务', tasks: [] },
        },
        (response) => {
          clearTimeout(timeout)
          if (response.success) {
            console.log(`✅ ${this.playerName} 房间创建成功: ${response.room.id}`)
            this.roomId = response.room.id
            this.currentRoom = response.room
            resolve(response.room)
          } else {
            console.error(`❌ ${this.playerName} 创建房间失败:`, response.message)
            reject(new Error(response.message))
          }
        },
      )
    })
  }

  // 加入房间
  async joinRoom(roomId) {
    console.log(`🚪 ${this.playerName} 加入房间: ${roomId}`)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('加入房间超时'))
      }, 10000)

      this.socket.emit(
        'room:join',
        {
          roomId: roomId,
          playerName: this.playerName,
        },
        (response) => {
          clearTimeout(timeout)
          if (response.success) {
            console.log(`✅ ${this.playerName} 成功加入房间: ${response.room.id}`)
            this.roomId = response.room.id
            this.currentRoom = response.room
            resolve(response.room)
          } else {
            console.error(`❌ ${this.playerName} 加入房间失败:`, response.message)
            reject(new Error(response.message))
          }
        },
      )
    })
  }

  // 开始游戏
  async startGame() {
    if (!this.roomId) return

    console.log(`🎮 ${this.playerName} 开始游戏...`)

    this.socket.emit(
      'game:start',
      {
        roomId: this.roomId,
      },
      (response) => {
        if (response.success) {
          console.log(`✅ ${this.playerName} 游戏开始成功`)
        } else {
          console.error(`❌ ${this.playerName} 开始游戏失败:`, response.message)
        }
      },
    )
  }

  // 检查游戏状态
  checkGameState() {
    if (!this.currentRoom) return

    // 检查是否轮到自己
    this.isMyTurn = this.currentRoom.currentUser === this.playerId

    // 检查游戏状态
    if (this.currentRoom.gameStatus === 'playing') {
      if (!this.gameStarted) {
        this.gameStarted = true
        console.log(`🎯 ${this.playerName} 游戏开始！`)
      }

      // 如果轮到自己，自动投骰子
      if (this.isMyTurn) {
        console.log(`🎲 轮到 ${this.playerName}，准备投骰子...`)
        setTimeout(() => this.rollDice(), 2000) // 延迟2秒投骰子
      }

      // 检查是否有任务需要完成
      if (this.currentRoom.gameState?.currentTask) {
        console.log(`📋 ${this.playerName} 发现任务，准备完成...`)
        setTimeout(() => this.completeTask(), 1000) // 延迟1秒完成任务
      }
    }

    // 检查游戏是否结束
    if (this.currentRoom.gameState?.winner) {
      const winner = this.currentRoom.gameState.winner
      console.log(`🏆 游戏结束！获胜者: ${winner.winnerName}`)
    }
  }

  // 投骰子
  rollDice() {
    if (!this.isMyTurn || !this.gameStarted) return

    console.log(`🎲 ${this.playerName} 投骰子...`)

    this.socket.emit(
      'game:action',
      {
        type: 'roll_dice',
        roomId: this.roomId,
        playerId: this.playerId,
      },
      (response) => {
        if (response.success) {
          console.log(`✅ ${this.playerName} 投骰子成功`)
        } else {
          console.error(`❌ ${this.playerName} 投骰子失败:`, response.message)
        }
      },
    )
  }

  // 完成任务
  completeTask() {
    const task = this.currentRoom?.gameState?.currentTask
    if (!task) return

    // 随机决定任务成功或失败 (80%成功率)
    const completed = Math.random() > 0.2

    console.log(`📋 ${this.playerName} 完成任务: ${completed ? '成功' : '失败'}`)

    this.socket.emit(
      'game:action',
      {
        type: 'complete_task',
        roomId: this.roomId,
        playerId: this.playerId,
        taskId: task.id,
        completed: completed,
      },
      (response) => {
        if (response.success) {
          console.log(`✅ ${this.playerName} 任务完成响应成功`)
        } else {
          console.error(`❌ ${this.playerName} 任务完成失败:`, response.message)
        }
      },
    )
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      console.log(`👋 ${this.playerName} 断开连接`)
      this.socket.disconnect()
    }
  }

  // 启动机器人
  async start() {
    try {
      await this.connect()

      if (this.mode === 'create') {
        await this.createRoom()
        // 等待其他玩家，然后自动开始游戏
        setTimeout(() => {
          if (this.currentRoom?.players.length >= 2) {
            this.startGame()
          }
        }, 5000)
      } else if (this.mode === 'join' && this.roomId) {
        await this.joinRoom(this.roomId)
      }

      console.log(`🚀 ${this.playerName} 启动完成！`)
    } catch (error) {
      console.error(`❌ ${this.playerName} 启动失败:`, error.message)
    }
  }
}

// 命令行参数处理
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    mode: 'create',
    count: 1,
    roomId: null,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case 'create':
        options.mode = 'create'
        if (nextArg && !isNaN(parseInt(nextArg))) {
          options.count = parseInt(nextArg)
          i++
        }
        break
      case 'join':
        options.mode = 'join'
        if (nextArg) {
          options.roomId = nextArg
          i++
        }
        if (args[i + 1] && !isNaN(parseInt(args[i + 1]))) {
          options.count = parseInt(args[i + 1])
          i++
        }
        break
    }
  }

  return options
}

// 主程序
async function main() {
  const options = parseArgs()

  console.log('🤖 简单机器人启动器')
  console.log('===================')
  console.log(`模式: ${options.mode}`)
  console.log(`数量: ${options.count}`)
  if (options.roomId) {
    console.log(`房间ID: ${options.roomId}`)
  }
  console.log('')

  const bots = []

  // 创建机器人
  for (let i = 0; i < options.count; i++) {
    const bot = new SimpleBot({
      playerName: `Bot_Player_${i + 1}`,
      mode: options.mode,
      roomId: options.roomId,
    })
    bots.push(bot)

    // 启动机器人，每个机器人间隔1秒启动
    setTimeout(() => {
      bot.start()
    }, i * 1000)
  }

  // 监听退出信号
  process.on('SIGINT', () => {
    console.log('\n🛑 正在停止所有机器人...')
    bots.forEach((bot) => bot.disconnect())
    setTimeout(() => process.exit(0), 1000)
  })

  console.log('按 Ctrl+C 退出\n')
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error)
  process.exit(1)
})

// 启动
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default SimpleBot
