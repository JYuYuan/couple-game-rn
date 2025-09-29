# 简单机器人使用说明

## 功能特性

- ✅ 自动连接到服务器
- ✅ 自动创建房间或加入指定房间
- ✅ 自动开始游戏
- ✅ 自动投骰子
- ✅ 自动完成任务（80%成功率）
- ✅ 支持多个机器人同时运行

## NPM 命令使用方法

### 快速启动命令
```bash
# 创建1个机器人并创建房间
npm run bot:create

# 创建2个机器人并创建房间
npm run bot:create:2

# 创建3个机器人并创建房间
npm run bot:create:3

# 创建4个机器人并创建房间
npm run bot:create:4

# 1个机器人加入房间（需要指定房间ID）
npm run bot:join ROOM123

# 基础机器人命令（需要额外参数）
npm run bot create 2
npm run bot join ROOM123 2
```

### 直接使用 node 命令
```bash
# 创建房间模式
node bot/simple-bot.js create [数量]
node bot/simple-bot.js create     # 1个机器人
node bot/simple-bot.js create 3   # 3个机器人

# 加入房间模式
node bot/simple-bot.js join [房间ID] [数量]
node bot/simple-bot.js join ROOM123     # 1个机器人
node bot/simple-bot.js join ROOM123 2   # 2个机器人
```

### 实际使用示例

1. **启动服务器**
   ```bash
   npm run dev
   ```

2. **创建机器人游戏**
   ```bash
   # 在另一个终端窗口
   npm run bot:create:2
   ```

3. **加入现有房间**
   ```bash
   # 如果知道房间ID，可以让更多机器人加入
   npm run bot join ROOM123 1
   ```

## 机器人行为

1. **连接阶段**: 自动连接到 `http://localhost:3001`
2. **房间阶段**: 根据模式创建或加入房间
3. **游戏阶段**:
   - 轮到自己时自动投骰子（延迟2秒）
   - 有任务时自动完成（延迟1秒，80%成功率）
   - 自动响应游戏状态变化
4. **结束阶段**: 显示获胜者信息

## 注意事项

- 确保服务器在 `localhost:3001` 运行
- 按 `Ctrl+C` 可以停止所有机器人
- 机器人会自动处理连接错误和重连
- 支持同时运行多个机器人实例

## 日志输出

机器人会输出详细的运行日志：
- 🤖 机器人创建
- 🔗 连接状态
- 🏠 房间操作
- 🎲 游戏动作
- 📋 任务完成
- 🏆 游戏结果

## 可用的 NPM Scripts

```json
{
  "bot": "node bot/simple-bot.js",
  "bot:create": "node bot/simple-bot.js create",
  "bot:create:2": "node bot/simple-bot.js create 2",
  "bot:create:3": "node bot/simple-bot.js create 3",
  "bot:create:4": "node bot/simple-bot.js create 4",
  "bot:join": "node bot/simple-bot.js join"
}
```