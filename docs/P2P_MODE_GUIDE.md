# P2P 模式使用指南

## 概述

P2P (Peer-to-Peer) 模式允许一台设备直接作为游戏服务器,其他设备通过 WebRTC 连接到这台设备进行游戏,完全不需要外部服务器。

### 架构对比

**传统模式** (Socket.IO + Node.js服务器):
```
设备A ← → Cloud Server ← → 设备B
        (需要部署服务器)
```

**P2P模式** (WebRTC):
```
设备A (房主/服务器) ← → 设备B (客人)
   (无需外部服务器,直接连接)
```

## 核心概念

### 三种连接模式

1. **`socket`** - 传统 Socket.IO 模式,连接到 Node.js 服务器
2. **`p2p-server`** - P2P 服务器模式,房主设备运行服务器
3. **`p2p-client`** - P2P 客户端模式,客人设备连接到房主

### 数据流

```
┌─────────────┐                  ┌─────────────┐
│   房主设备   │                  │   客人设备   │
│             │                  │             │
│  P2P Server │ ←── WebRTC ───→ │  P2P Client │
│             │     Data         │             │
│   Room      │     Channel      │             │
│   Player    │                  │             │
│   Game      │                  │             │
└─────────────┘                  └─────────────┘
```

## 快速开始

### 1. 房主创建 P2P 房间

```typescript
import { socketService } from '@/services/socket-service'

// 1. 启动 P2P 服务器
await socketService.startP2PServer(playerId)

// 2. 创建房间
await socketService.createRoom({
  roomName: 'P2P 游戏房间',
  playerName: '房主',
  maxPlayers: 4,
  gameType: 'fly',
})

// 3. 邀请玩家(当客人准备加入时)
await socketService.invitePlayerToP2P(guestPlayerId)
```

### 2. 客人加入 P2P 房间

```typescript
import { socketService } from '@/services/socket-service'

// 1. 连接到房主的 P2P 服务器
await socketService.connectToP2PServer(playerId, hostPlayerId)

// 2. 等待 WebRTC 连接建立(自动)

// 3. 加入房间
await socketService.joinRoom({
  roomId: 'ROOM_ID',
  playerName: '客人',
})
```

### 3. 游戏操作

无论是房主还是客人,游戏操作的API完全相同:

```typescript
// 开始游戏(房主)
socketService.startGame({ roomId })

// 投骰子
socketService.rollDice({ roomId, playerId }, (result) => {
  console.log('骰子结果:', result)
})

// 完成任务
socketService.completeTask({ roomId, taskId, playerId, completed: true })
```

## 完整示例

### 房主端

```typescript
import { socketService } from '@/services/socket-service'
import { useSettingsStore } from '@/store'

function HostScreen() {
  const { playerId } = useSettingsStore()
  const [room, setRoom] = useState(null)

  const createP2PRoom = async () => {
    try {
      // 1. 启动 P2P 服务器
      await socketService.startP2PServer(playerId)
      console.log('P2P Server started')

      // 2. 监听房间更新
      socketService.on('room:update', (updatedRoom) => {
        setRoom(updatedRoom)
        console.log('Room updated:', updatedRoom)
      })

      // 3. 创建房间
      await socketService.createRoom({
        roomName: 'My P2P Room',
        playerName: 'Host Player',
        maxPlayers: 4,
        gameType: 'fly',
      })

      console.log('Room created, waiting for players...')
    } catch (error) {
      console.error('Failed to create P2P room:', error)
    }
  }

  const invitePlayer = async (guestPlayerId: string) => {
    try {
      // 发送 WebRTC offer 给客人
      await socketService.invitePlayerToP2P(guestPlayerId)
      console.log('Invitation sent to:', guestPlayerId)
    } catch (error) {
      console.error('Failed to invite player:', error)
    }
  }

  const startGame = () => {
    if (room) {
      socketService.startGame({ roomId: room.id })
    }
  }

  return (
    <View>
      <Button title="创建 P2P 房间" onPress={createP2PRoom} />
      {room && (
        <>
          <Text>房间ID: {room.id}</Text>
          <Text>玩家数: {room.players.length}/{room.maxPlayers}</Text>
          <Button title="开始游戏" onPress={startGame} />
        </>
      )}
    </View>
  )
}
```

### 客人端

```typescript
import { socketService } from '@/services/socket-service'
import { useSettingsStore } from '@/store'

function GuestScreen() {
  const { playerId } = useSettingsStore()
  const [room, setRoom] = useState(null)
  const [connecting, setConnecting] = useState(false)

  const joinP2PRoom = async (hostPlayerId: string, roomId: string) => {
    try {
      setConnecting(true)

      // 1. 连接到房主的 P2P 服务器
      await socketService.connectToP2PServer(playerId, hostPlayerId)
      console.log('Connected to P2P server')

      // 2. 监听房间更新
      socketService.on('room:update', (updatedRoom) => {
        setRoom(updatedRoom)
        console.log('Room updated:', updatedRoom)
      })

      // 3. 加入房间
      await socketService.joinRoom({
        roomId,
        playerName: 'Guest Player',
      })

      console.log('Joined room successfully')
    } catch (error) {
      console.error('Failed to join P2P room:', error)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <View>
      <Button
        title="加入 P2P 房间"
        onPress={() => joinP2PRoom('HOST_PLAYER_ID', 'ROOM_ID')}
        disabled={connecting}
      />
      {connecting && <Text>正在连接...</Text>}
      {room && (
        <>
          <Text>房间: {room.name}</Text>
          <Text>玩家数: {room.players.length}</Text>
        </>
      )}
    </View>
  )
}
```

## WebRTC 信令

P2P 连接建立需要信令服务器交换 SDP 和 ICE candidates。当前实现使用现有的 Socket.IO 连接作为信令通道。

### 信令流程

```
房主                           信令服务器                       客人
 │                                 │                           │
 │ 1. createPeerConnection()       │                           │
 │ ──────────────────────>         │                           │
 │                                 │                           │
 │ 2. offer (SDP)                  │                           │
 │ ──────────────────────────────> │ ───────────────────────> │
 │                                 │                           │
 │                                 │        3. answer (SDP)    │
 │ <────────────────────────────── │ <─────────────────────── │
 │                                 │                           │
 │ 4. ICE candidates              │      ICE candidates        │
 │ <────────────────────────────> │ <──────────────────────> │
 │                                 │                           │
 │           5. WebRTC Data Channel established                │
 │ <─────────────────────────────────────────────────────────> │
```

## 架构组件

### 1. P2P Server (`services/p2p-server.ts`)

运行在房主设备上,提供:
- WebRTC 连接管理
- 房间管理
- 玩家管理
- 游戏逻辑处理(复刻服务端)

### 2. P2P Client (`services/p2p-client.ts`)

运行在客人设备上,提供:
- WebRTC 连接
- 与 P2P Server 通信
- 统一的游戏 API

### 3. WebRTC Signaling (`services/webrtc-signaling.ts`)

负责 WebRTC 连接建立前的信令交换:
- SDP offer/answer
- ICE candidates

### 4. 内存存储

P2P 模式使用内存存储替代 Redis:
- `services/p2p/room-manager.ts` - 房间管理
- `services/p2p/player-manager.ts` - 玩家管理
- `services/p2p/game-instance-manager.ts` - 游戏实例管理

## API 参考

### SocketService P2P 方法

```typescript
// 启动 P2P 服务器(房主)
async startP2PServer(playerId: string): Promise<void>

// 连接到 P2P 服务器(客人)
async connectToP2PServer(playerId: string, hostPlayerId: string): Promise<void>

// 邀请玩家加入 P2P 房间(房主)
async invitePlayerToP2P(targetPlayerId: string): Promise<void>

// 停止 P2P 模式
async stopP2P(): Promise<void>

// 获取连接模式
getConnectionMode(): 'socket' | 'p2p-server' | 'p2p-client'
```

### 通用方法(所有模式适用)

```typescript
// 房间操作
async createRoom(data: CreateRoomData): Promise<void>
async joinRoom(data: JoinRoomData): Promise<void>
leaveRoom(): void

// 游戏操作
startGame(data: GameStartData): void
rollDice(data: DiceRollData, callback?: (result: DiceRollResult) => void): void
completeTask(data: TaskCompleteData): void
```

## 事件监听

```typescript
// 房间更新
socketService.on('room:update', (room) => {
  console.log('Room updated:', room)
})

// 房间销毁
socketService.on('room:destroyed', (data) => {
  console.log('Room destroyed:', data.reason)
})

// 游戏事件
socketService.on('game:dice', (data) => {
  console.log('Dice rolled:', data)
})

socketService.on('game:victory', (data) => {
  console.log('Victory!', data)
})

// 连接事件
socketService.on('connect', () => {
  console.log('Connected')
})

socketService.on('disconnect', () => {
  console.log('Disconnected')
})
```

## 优势与限制

### 优势

✅ **零服务器成本** - 无需部署和维护服务器
✅ **低延迟** - 直接点对点连接,延迟更低
✅ **隐私保护** - 数据不经过第三方服务器
✅ **简单部署** - 无需复杂的服务器配置

### 限制

⚠️ **房主在线要求** - 房主离开游戏结束
⚠️ **网络要求** - 需要良好的网络连接
⚠️ **设备性能** - 房主设备需要足够性能
⚠️ **人数限制** - 建议2-4人游戏

## 网络要求

1. **房主设备**:
   - 稳定的网络连接
   - 支持 WebRTC
   - 足够的带宽(上行重要)

2. **客人设备**:
   - 支持 WebRTC
   - 能够连接到房主

3. **防火墙**:
   - 允许 WebRTC 连接
   - STUN 服务器可访问

## 故障排除

### 无法建立连接

1. 检查网络连接
2. 确认 WebRTC 支持
3. 检查防火墙设置
4. 尝试使用 TURN 服务器

### 连接断开

1. 检查网络稳定性
2. 查看控制台日志
3. 重新建立连接

### 性能问题

1. 减少玩家数量
2. 优化游戏逻辑
3. 检查设备性能

## 调试

```typescript
// 启用详细日志
console.log('Connection mode:', socketService.getConnectionMode())
console.log('P2P Server status:', p2pServer.getStatus())
console.log('P2P Client status:', p2pClient.getStatus())

// 监听所有事件
socketService.listRegisteredEvents().forEach(event => {
  console.log('Registered event:', event)
})
```

## 下一步

1. **测试连接** - 在真实设备上测试 P2P 连接
2. **优化性能** - 根据实际使用情况优化
3. **添加 TURN** - 为无法直连的情况添加 TURN 服务器支持
4. **错误处理** - 完善错误处理和重连机制

## 相关文档

- [WebRTC 官方文档](https://webrtc.org/)
- [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc)
- [Socket.IO 文档](https://socket.io/docs/v4/)
