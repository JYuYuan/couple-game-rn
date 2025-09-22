# 飞行棋游戏模拟器

这是一个用于测试在线飞行棋游戏的机器人模拟器。它可以创建多个虚拟玩家，自动进行游戏测试。

## 功能特性

🤖 **智能机器人**: 自动加入房间、投掷骰子、移动棋子、完成任务
🎮 **多种游戏模式**: 支持飞行棋、转盘、扫雷对战
👥 **多玩家支持**: 支持2-4个玩家同时游戏
🏠 **灵活房间管理**: 支持创建新房间或加入现有房间
🎯 **自动化测试**: 无需人工干预，全自动游戏流程
📊 **实时监控**: 实时显示游戏状态和玩家信息
⚙️ **灵活配置**: 可配置游戏参数和机器人行为

## 安装依赖

```bash
cd server
npm install socket.io-client
```

## 使用方法

### 1. 启动游戏服务器

首先需要启动游戏服务器：

```bash
cd server
node index.js
```

服务器将在 http://localhost:3001 上运行。

### 2. 运行模拟器

#### 交互式命令行模式（推荐）

```bash
node simulator-cli.js
```

启动后，输入 `help` 查看所有可用命令：

```
> help
```

#### 快速启动模式

```bash
# 快速启动2人飞行棋游戏
node simulator-cli.js --quick

# 启动3人游戏
node simulator-cli.js --players 3

# 启动转盘游戏
node simulator-cli.js --type wheel

# 启动4人扫雷对战
node simulator-cli.js --players 4 --type minesweeper

# 加入现有房间（1个机器人）
node simulator-cli.js --join ABC123

# 加入现有房间（2个机器人）
node simulator-cli.js --join ABC123 --bots 2
```

## 命令参考

### 基本操作
- `start [players] [type]` - 创建房间并开始游戏模拟
- `join <roomId> [players]` - 加入指定房间（默认1个机器人）
- `stop` - 停止游戏模拟
- `status` - 显示当前状态
- `config` - 显示配置信息

### 机器人管理
- `add-bot [name]` - 添加机器人到当前游戏
- `remove-bot <name>` - 移除指定机器人
- `auto-on` - 启用所有机器人自动游戏
- `auto-off` - 禁用所有机器人自动游戏

### 退出
- `quit` 或 `exit` - 退出程序

## 使用示例

### 示例1: 创建房间测试

```bash
> start 2 fly
🚀 开始游戏模拟: 2个玩家, 游戏类型: fly
✅ 游戏模拟启动成功!
🏠 房间ID: ABC123
```

### 示例2: 加入现有房间

```bash
> join ABC123 1
🚪 加入房间: ABC123, 机器人数量: 1
✅ 成功加入房间!
🏠 房间ID: ABC123
🤖 机器人数量: 1
```

### 示例3: 查看游戏状态

```bash
> status
📊 当前状态:
🎯 模式: 加入房间
🏠 房间ID: ABC123
🤖 机器人数量: 3
🎮 游戏类型: fly

机器人列表:
  1. 🟢 Bot_Player_1 🎯 (socket_id_1)
  2. 🟢 Bot_Player_2 ⏳ (socket_id_2)
  3. 🟢 NewBot ⏳ (socket_id_3)
```

### 示例4: 动态添加机器人

```bash
> start 2
> add-bot SuperBot
✅ 机器人 SuperBot 已添加到游戏

> status
🤖 机器人数量: 3
```

### 示例3: 控制自动游戏

```bash
> auto-off
✅ 所有机器人自动游戏已禁用

> auto-on
✅ 所有机器人自动游戏已启用
```

## 机器人行为

机器人玩家具有以下智能行为：

1. **自动连接**: 自动连接到游戏服务器
2. **自动加入**: 自动创建或加入游戏房间
3. **智能投掷**: 在轮到自己时自动投掷骰子
4. **自动移动**: 根据骰子结果自动移动棋子
5. **任务处理**: 自动完成触发的任务（70%成功率）
6. **错误恢复**: 自动处理网络错误和重连

## 配置选项

### 游戏配置
- `playersCount`: 玩家数量 (2-4)
- `gameType`: 游戏类型 ('fly', 'wheel', 'minesweeper')
- `taskSetId`: 任务集ID (默认: 'default')
- `autoStart`: 是否自动开始游戏
- `roomName`: 房间名称

### 机器人配置
- `diceDelay`: 投掷骰子延迟 (1.5-2.5秒)
- `taskDelay`: 任务完成延迟 (1-1.5秒)
- `autoPlay`: 是否自动游戏

## 故障排除

### 连接失败
```bash
❌ Bot_Player_1 连接失败: connect ECONNREFUSED
```
**解决方案**: 确保游戏服务器已启动并运行在正确端口。

### 房间创建失败
```bash
❌ 房间创建失败: Server error
```
**解决方案**: 检查服务器日志，确保服务器正常运行。

### 机器人无响应
```bash
⏳ Bot_Player_1 不是自己的回合或游戏未开始
```
**解决方案**: 这是正常现象，机器人会等待轮到自己的回合。

## 开发和调试

### 启用详细日志

机器人会自动输出详细的操作日志，包括：
- 连接状态
- 房间事件
- 游戏动作
- 错误信息

### 自定义机器人行为

可以修改 `bot-player.js` 中的参数来调整机器人行为：

```javascript
// 修改投掷延迟
diceDelay: 3000, // 3秒延迟

// 修改任务成功率
completeTask(taskId, Math.random() > 0.5); // 50% 成功率
```

## API 参考

### BotPlayer 类

主要方法：
- `connect()` - 连接到服务器
- `createRoom(roomName, maxPlayers, taskSetId, gameType)` - 创建房间
- `joinRoom(roomId)` - 加入房间
- `startGame()` - 开始游戏
- `rollDice()` - 投掷骰子
- `completeTask(taskId, completed)` - 完成任务
- `disconnect()` - 断开连接

### GameSimulator 类

主要方法：
- `createBots(count)` - 创建机器人
- `startSimulation()` - 开始模拟
- `stopSimulation()` - 停止模拟
- `addBot(botName)` - 添加机器人
- `removeBot(botName)` - 移除机器人
- `setAutoPlay(enabled)` - 设置自动游戏

## 注意事项

1. **服务器依赖**: 确保游戏服务器在运行模拟器之前已启动
2. **网络连接**: 机器人需要稳定的网络连接到服务器
3. **资源使用**: 每个机器人会占用一个Socket连接
4. **游戏规则**: 机器人遵循与真实玩家相同的游戏规则

## 技术支持

如果遇到问题，请检查：
1. 服务器是否正常运行
2. 网络连接是否稳定
3. Node.js版本是否兼容
4. 依赖包是否正确安装

---

Happy Gaming! 🎮