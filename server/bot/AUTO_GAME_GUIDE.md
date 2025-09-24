# 自动游戏功能使用指南

## 功能概述

新增的自动游戏功能允许你精细控制机器人的行为，支持以下模式：

### 自动模式
- **完全自动** (`auto-on`): 机器人自动摇骰子 + 自动完成任务
- **只自动摇骰子** (`auto-dice`): 只自动摇骰子，任务需手动完成
- **只自动完成任务** (`auto-task`): 只自动完成任务，摇骰子需手动操作
- **完全手动** (`manual`): 所有操作都需手动执行

### 手动操作
- **手动摇骰子** (`dice [botName]`): 让指定机器人摇骰子
- **手动完成任务** (`task [botName] [result]`): 让指定机器人完成任务

## 使用示例

### 1. 启动游戏模拟
```bash
# 创建房间并启动游戏
node simulator-cli.js
> start 2 fly

# 或快速启动
node simulator-cli.js --players 2 --type fly
```

### 2. 加入现有房间
```bash
# 通过CLI加入
node simulator-cli.js
> join ABC123 2

# 或快速加入
node simulator-cli.js --join ABC123 --bots 2
```

### 3. 自动模式控制
```bash
# 完全自动模式（默认）
> auto-on

# 只自动摇骰子，任务手动完成
> auto-dice

# 只自动完成任务，摇骰子手动操作
> auto-task

# 完全手动模式
> manual
```

### 4. 手动操作
```bash
# 查看当前状态
> status

# 为指定机器人摇骰子
> dice Bot_Player_1

# 为当前轮次的机器人摇骰子
> dice

# 让指定机器人完成任务（成功）
> task Bot_Player_1 true

# 让指定机器人完成任务（失败）
> task Bot_Player_1 false

# 让当前有任务的机器人完成任务（默认成功）
> task
```

## 典型使用场景

### 场景1: 调试任务逻辑
```bash
> start 2 fly
> auto-dice           # 只自动摇骰子
# 等待触发任务...
> task Bot_Player_1 false  # 手动让任务失败，观察游戏逻辑
```

### 场景2: 测试玩家切换
```bash
> start 2 fly
> manual             # 完全手动模式
> dice               # 手动摇骰子
# 观察游戏状态变化...
> dice Bot_Player_2  # 让下一个玩家摇骰子
```

### 场景3: 快速游戏测试
```bash
> start 2 fly
> auto-on            # 完全自动，快速完成游戏
```

## 命令参考

| 命令 | 参数 | 描述 |
|------|------|------|
| `start` | `[players] [type]` | 创建房间并开始游戏 |
| `join` | `<roomId> [players]` | 加入指定房间 |
| `auto-on` | - | 启用完全自动游戏 |
| `auto-off` | - | 禁用所有自动功能 |
| `auto-dice` | - | 只启用自动摇骰子 |
| `auto-task` | - | 只启用自动完成任务 |
| `manual` | - | 完全手动模式 |
| `dice` | `[botName]` | 手动摇骰子 |
| `task` | `[botName] [result]` | 手动完成任务 |
| `status` | - | 显示当前状态 |
| `stop` | - | 停止游戏模拟 |

## 注意事项

1. 手动操作只能在对应的时机执行（轮到该玩家 / 有待处理任务）
2. 自动和手动模式可以随时切换
3. 使用 `status` 命令查看当前哪个机器人轮到操作或有任务待处理
4. 任务结果默认为成功（true），可以手动指定失败（false）