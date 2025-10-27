# LAN 测试脚本使用指南

这个文档说明如何使用局域网(LAN)测试脚本来模拟房间加入功能。

## 脚本列表

### 1. test-lan-join.js

完整的 LAN 房间加入测试脚本,支持房间扫描和加入。

#### 功能特性

- 自动扫描局域网中的房间(UDP 广播)
- 连接到房主的 TCP 服务器
- 发送加入房间请求
- 实时接收游戏事件
- 命令行参数配置

#### 使用方法

**基础用法 - 自动扫描并加入第一个房间:**

```bash
node scripts/test-lan-join.js
```

**只扫描房间,不加入:**

```bash
node scripts/test-lan-join.js --scan-only
```

**手动指定房主 IP 和端口:**

```bash
node scripts/test-lan-join.js --host 192.168.1.100 --port 3306 --room-id <房间ID>
```

**自定义玩家名称:**

```bash
node scripts/test-lan-join.js --player-name "Alice"
```

**延长扫描时间(15秒):**

```bash
node scripts/test-lan-join.js --timeout 15000
```

#### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--scan-only` | 只扫描房间,不加入 | false |
| `--host <ip>` | 手动指定房主IP(跳过扫描) | null |
| `--port <port>` | 手动指定TCP端口 | 3306 |
| `--room-id <id>` | 指定要加入的房间ID | null |
| `--player-name <name>` | 玩家名称 | "测试玩家" |
| `--timeout <ms>` | 扫描超时时间 | 10000 |
| `--help` | 显示帮助信息 | - |

### 2. test-lan-simple.js

简化版的测试脚本,用于快速测试连接和消息传递。

#### 使用方法

```bash
node scripts/test-lan-simple.js
```

编辑脚本中的配置来修改连接参数。

## 工作原理

### UDP 广播发现

1. 脚本启动 UDP socket 监听端口 `8888`
2. 房主设备周期性发送房间信息广播
3. 脚本接收并解析广播消息
4. 显示所有发现的房间

广播消息格式:
```json
{
  "roomId": "uuid",
  "roomName": "房间名称",
  "hostName": "房主名称",
  "hostIP": "192.168.1.100",
  "tcpPort": 3306,
  "maxPlayers": 2,
  "currentPlayers": 1,
  "gameType": "fly",
  "timestamp": 1234567890
}
```

### TCP 连接和通信

1. 脚本连接到房主的 TCP 服务器
2. 发送 `client:init` 初始化消息
3. 发送 `room:join` 加入房间请求
4. 接收和处理服务器事件

消息格式:
```json
{
  "type": "event",
  "event": "room:join",
  "playerId": "uuid",
  "requestId": "1234567890_abc123",  // 重要：必须包含requestId
  "data": {
    "roomId": "uuid",
    "playerName": "测试玩家",
    "avatar": "",  // 注意：字段名是 avatar，不是 avatarId
    "gender": "man"
  }
}
```

**重要提示**：
- `requestId` 是必需的，服务器使用它来发送响应
- 字段名必须是 `avatar` 而不是 `avatarId`
- 服务器会返回 `type: 'response'` 的消息，包含房间信息

## 支持的事件

脚本会自动处理以下游戏事件:

**服务器响应**:
- `type: 'response'` - 服务器对请求的响应（如加入房间成功）
  - 包含 `requestId` 用于匹配请求
  - `data` 字段包含房间完整信息

**游戏事件**:
- `room:joined` - 成功加入房间（已废弃，使用response代替）
- `room:player-joined` - 其他玩家加入
- `room:player-left` - 玩家离开
- `game:started` - 游戏开始
- `game:dice-rolled` - 掷骰子
- `game:player-moved` - 玩家移动
- `game:ended` - 游戏结束

**广播事件**:
- `type: 'broadcast'` - 服务器向所有客户端广播的消息
  - `event: 'room:update'` - 房间状态更新

## 测试场景

### 场景 1: 房间扫描测试

测试 UDP 广播是否正常工作:

```bash
# 终端 1 - 在 APP 中创建房间
# APP 会自动发送 UDP 广播

# 终端 2 - 运行扫描
node scripts/test-lan-join.js --scan-only --timeout 15000
```

预期结果:
- 显示发现的所有房间
- 包含房间名称、IP、端口等信息

### 场景 2: 自动加入房间测试

测试完整的加入流程:

```bash
# 终端 1 - 在 APP 中创建房间

# 终端 2 - 自动扫描并加入
node scripts/test-lan-join.js --player-name "测试机器人"
```

预期结果:
- 发现房间
- 建立 TCP 连接
- 成功加入房间
- APP 中显示新玩家加入

### 场景 3: 手动连接测试

直接连接到已知的房主 IP:

```bash
# 获取房主 IP 和房间 ID
# 然后运行:
node scripts/test-lan-join.js --host 192.168.1.100 --port 3306 --room-id <房间ID>
```

### 场景 4: 多客户端测试

测试多个玩家同时加入:

```bash
# 终端 2
node scripts/test-lan-join.js --player-name "Alice"

# 终端 3
node scripts/test-lan-join.js --player-name "Bob"

# 终端 4
node scripts/test-lan-join.js --player-name "Charlie"
```

## 故障排除

### 问题: 扫描不到房间

**可能原因:**
- APP 未开启房间或 UDP 广播未启动
- 设备不在同一局域网
- 防火墙阻止 UDP 端口 8888

**解决方案:**
```bash
# 检查端口是否开放
netstat -an | grep 8888

# 尝试延长扫描时间
node scripts/test-lan-join.js --scan-only --timeout 30000
```

### 问题: TCP 连接失败

**可能原因:**
- 房主 TCP 服务器未启动
- IP 地址或端口错误
- 防火墙阻止 TCP 连接

**解决方案:**
```bash
# 测试端口连通性
nc -zv 192.168.1.100 3306

# 或使用 telnet
telnet 192.168.1.100 3306
```

### 问题: 加入房间失败

**可能原因:**
- 房间 ID 错误
- 房间已满
- 房间已开始游戏
- **消息格式错误**（常见问题）

**解决方案:**
- 确认房间 ID 正确
- 检查房间状态
- 查看服务器日志
- **确保消息包含 requestId**
- **确保字段名正确（avatar 不是 avatarId）**

**调试步骤:**
```bash
# 在APP端查看服务器日志
# 应该能看到类似的日志：
# 📨 [TCPServer] 收到 room:join 请求
# ✅ [TCPServer] 玩家创建成功
# ✅ [TCPServer] 玩家已加入房间，当前玩家数: 2
```

## 开发用途

### 作为测试客户端

可以将此脚本用作自动化测试:

```javascript
const { LANRoomClient } = require('./scripts/test-lan-join.js')

async function runTest() {
  const client = new LANRoomClient('test-id', '测试机器人')

  await client.connect('192.168.1.100', 3306)
  client.joinRoom('room-id')

  // 监听事件
  client.on('room:joined', (data) => {
    console.log('加入成功!', data)
  })
}
```

### 压力测试

模拟多个客户端:

```javascript
async function stressTest() {
  const clients = []

  // 创建 10 个客户端
  for (let i = 0; i < 10; i++) {
    const client = new LANRoomClient(null, `Bot-${i}`)
    await client.connect('192.168.1.100', 3306)
    client.joinRoom('room-id')
    clients.push(client)
  }

  console.log('10 个客户端已连接')
}
```

## 注意事项

1. **网络要求**: 确保所有设备在同一局域网中
2. **端口占用**: UDP 8888 和 TCP 3306(默认)端口不能被占用
3. **超时设置**: 扫描超时应该大于广播间隔(2秒)
4. **消息格式**: 必须与服务器端消息格式匹配
5. **玩家 ID**: 每次运行会生成新的 UUID

## 相关文件

- `/services/lan/udp-broadcast.ts` - UDP 广播服务实现
- `/services/lan/tcp-server.ts` - TCP 服务器实现
- `/services/lan/tcp-client.ts` - TCP 客户端实现
- `/services/lan/lan-service.ts` - LAN 服务统一管理
- `/types/online.ts` - 类型定义

## 更多示例

查看项目中的其他测试脚本了解更多用法:
- `server/bot/simple-bot.js` - 在线模式测试机器人
