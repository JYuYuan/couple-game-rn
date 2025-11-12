# 🚀 服务器部署指南

基于 Socket.IO 的实时多人游戏服务器部署文档

---

## 📝 部署平台：Render.com（推荐）

### ⭐ 为什么选择 Render？

- ✅ **完全免费**：无需信用卡
- ✅ **支持 WebSocket**：完美运行 Socket.IO
- ✅ **自动部署**：连接 GitHub 自动更新
- ✅ **免费 SSL**：自动 HTTPS
- ⚠️ **冷启动**：15分钟无活动后休眠，首次访问需等待 30-60 秒

---

## 🧊 什么是冷启动？

### 简单理解

想象你的服务器是一只爱睡觉的小猫 🐱💤

**正常运行（热状态）**：
```
用户访问 → 服务器立即响应 ⚡ （0.1 秒）
```

**冷启动（休眠后）**：
```
15分钟无人访问
    ↓
服务器休眠 💤 （节省资源）
    ↓
用户访问游戏
    ↓
唤醒服务器 😴 → 启动环境 → 加载代码 → 准备就绪 ✅
    ↓
约 30-60 秒后才能响应 ⏰
```

### 对玩家的影响

**第一个玩家**：
- 访问游戏 → 看到 "连接中..." → 等待 30-60 秒 ⏳
- 然后正常进入游戏 ✅

**后续玩家**（15分钟内）：
- 访问游戏 → 立即响应 ⚡
- 秒进游戏 🎮

---

## 🎯 快速部署步骤

### 1️⃣ 准备工作

确保代码已推送到 GitHub：

```bash
cd server
git add .
git commit -m "准备部署到 Render"
git push
```

### 2️⃣ 在 Render 创建服务

1. 访问 [https://render.com](https://render.com)
2. 点击 **"Sign Up"** 或 **"Get Started"**
3. 使用 **GitHub 账号登录**
4. 授权 Render 访问你的仓库

### 3️⃣ 创建 Web Service

1. 点击 **"New +"** → 选择 **"Web Service"**
2. 找到并选择你的 `couple-game-rn` 仓库
3. Render 会自动检测到 `server/render.yaml` 配置

### 4️⃣ 配置服务

**自动检测的配置**：
- **Name**: `couple-game-server`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: `Free`

**⚠️ 重要：手动调整**：
- **Root Directory**: 设置为 `server` 📁
  - 在配置页面找到 "Root Directory" 字段
  - 输入：`server`
- **Region**: 选择 `Oregon` 或 `Singapore`
  - Oregon：美国西海岸
  - Singapore：离中国大陆较近

### 5️⃣ 开始部署

1. 点击 **"Create Web Service"**
2. 等待构建和部署（约 3-5 分钟）
3. 查看实时日志了解部署进度
4. 部署成功后会显示服务 URL

**示例 URL**：
```
https://couple-game-server.onrender.com
```

### 6️⃣ 测试服务

访问你的服务 URL，应该看到：

```json
{
  "status": "ok",
  "service": "Couple Game Server",
  "version": "1.0.0",
  "timestamp": "2024-11-12T...",
  "uptime": 123.45
}
```

**健康检查端点**：
```
https://couple-game-server.onrender.com/health
```

**统计信息端点**：
```
https://couple-game-server.onrender.com/stats
```

---

## 🔗 更新客户端配置

部署成功后，需要更新前端的服务器地址。

### 找到配置文件

在前端项目中查找：
- `constants/config.ts`
- `constants/index.ts`
- `services/socket.ts`
- `.env` 文件

### 更新服务器 URL

```typescript
// 之前（本地开发）
const SOCKET_URL = 'http://localhost:3001'

// 更新为（生产环境）
const SOCKET_URL = 'https://couple-game-server.onrender.com'
```

**推荐配置**（自动切换环境）：

```typescript
const SOCKET_URL = __DEV__
  ? 'http://localhost:3001'  // 开发环境
  : 'https://couple-game-server.onrender.com'  // 生产环境
```

---

## ⚡ 解决冷启动问题

### 方案 1：添加友好的加载提示 ✨

在客户端连接时显示友好提示：

```typescript
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

function useSocket() {
  const [status, setStatus] = useState('connecting')
  const socket = io(SOCKET_URL)

  useEffect(() => {
    socket.on('connect', () => {
      setStatus('connected')
      console.log('✅ 服务器连接成功')
    })

    socket.on('connect_error', () => {
      setStatus('warming')
      console.log('⏳ 服务器启动中，请稍候 30 秒...')
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
    })
  }, [])

  return { socket, status }
}
```

### 方案 2：使用 UptimeRobot 保持唤醒 🤖

**UptimeRobot**（完全免费，推荐）：

1. 访问 [https://uptimerobot.com](https://uptimerobot.com)
2. 注册免费账号
3. 点击 **"+ Add New Monitor"**
4. 配置如下：
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Couple Game Server`
   - **URL**: `https://couple-game-server.onrender.com/health`
   - **Monitoring Interval**: `5 minutes`（每5分钟ping一次）
5. 点击 **"Create Monitor"**

✨ **效果**：服务器将保持唤醒状态，用户访问时无需等待！

### 方案 3：客户端预热 🔥

在应用启动时自动预热服务器：

```typescript
// App.tsx 或 index.ts
useEffect(() => {
  // 应用启动时预热服务器
  fetch('https://couple-game-server.onrender.com/health')
    .then(() => console.log('🔥 服务器已预热'))
    .catch(() => console.log('⏳ 服务器启动中...'))
}, [])
```

---

## 📊 监控和日志

### 查看实时日志

1. 进入 [Render Dashboard](https://dashboard.render.com)
2. 选择 `couple-game-server` 服务
3. 点击 **"Logs"** 标签
4. 查看实时服务器日志

### 性能监控

在 Dashboard 可以看到：
- 🌐 **Requests**: 请求数量和响应时间
- 💾 **Memory**: 内存使用情况
- ⚡ **CPU**: CPU 使用率
- 🔄 **Deploys**: 部署历史记录

### 设置告警（可选）

在 Render Dashboard 可以配置：
- 服务宕机通知
- 高内存使用告警
- 部署失败提醒

---

## 🔄 自动重新部署

Render 会自动监听 GitHub 仓库变化：

```bash
# 每次推送代码
git add .
git commit -m "更新游戏逻辑"
git push
```

**自动流程**：
1. GitHub 检测到推送
2. 触发 Render Webhook
3. Render 拉取最新代码
4. 重新构建项目
5. 自动部署新版本
6. 平滑切换（零停机）

**无需手动操作！** 🎉

---

## ⚙️ 环境变量配置

Render 会自动设置基本环境变量，如需添加自定义变量：

1. 进入 Render Dashboard
2. 选择服务 → **"Environment"** 标签
3. 点击 **"Add Environment Variable"**
4. 添加变量，例如：

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `LOG_LEVEL` | `info` | 日志级别 |

---

## 🐛 常见问题

### Q1: 部署失败，显示 "Build failed"

**解决方法**：

1. 检查 **Root Directory** 是否设置为 `server`
2. 确认 `package.json` 中有正确的脚本：
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```
3. 查看构建日志找到具体错误信息
4. 确保 TypeScript 编译正常：
   ```bash
   npm run build
   ```

### Q2: 部署成功但访问显示 "Application failed to respond"

**可能原因**：
- ✅ 检查 `index.ts` 中的端口配置：
  ```typescript
  const PORT = process.env.PORT || 3001
  ```
- ✅ 确认服务器正确启动
- ✅ 查看 Render 日志是否有错误

### Q3: 服务器响应很慢（30-60秒）

这是**正常的冷启动**现象。解决方法：
- 使用 UptimeRobot 保持唤醒（推荐）
- 添加加载提示改善用户体验
- 考虑升级到付费套餐（$7/月，无休眠）

### Q4: WebSocket 连接失败

**检查清单**：
- ✅ 客户端使用 `https://` 而不是 `http://`
- ✅ Socket.IO 版本匹配（客户端和服务端）
- ✅ CORS 配置正确
- ✅ 防火墙没有阻止 WebSocket

**CORS 配置示例**：
```typescript
const io = new Server(server, {
  cors: {
    origin: '*',  // 生产环境建议指定具体域名
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
```

### Q5: 如何查看当前连接的玩家数？

访问统计端点：
```
https://couple-game-server.onrender.com/stats
```

返回示例：
```json
{
  "connectedClients": 4,
  "uptime": 12345.67,
  "memory": { ... }
}
```

---

## 🎮 完整部署流程总结

```bash
# 1. 推送代码到 GitHub
cd server
git add .
git commit -m "deploy: 准备部署服务器"
git push

# 2. 在 Render 创建服务
#    - 访问 render.com
#    - 连接 GitHub
#    - 创建 Web Service
#    - 设置 Root Directory: server
#    - 选择 Region: Oregon 或 Singapore

# 3. 等待部署完成（3-5分钟）

# 4. 测试服务器
#    访问: https://your-service.onrender.com

# 5. 配置 UptimeRobot 防止休眠（推荐）

# 6. 更新客户端配置
#    修改 SOCKET_URL 为 Render 提供的 URL

# 7. 推送客户端代码
cd ..
git add .
git commit -m "更新服务器地址"
git push

# 🎉 部署完成！开始游戏吧！
```

---

## 💡 优化建议

1. **使用 UptimeRobot** - 防止服务器休眠（强烈推荐）
2. **添加加载动画** - 提升冷启动时的用户体验
3. **选择最近的区域** - Singapore 离中国大陆更近，延迟更低
4. **定期查看日志** - 及时发现和解决问题
5. **配置告警** - 服务宕机时及时收到通知

---

## 💰 成本说明

**Render 免费套餐**：
- ✅ 750 小时/月（够一个服务 24/7 运行）
- ✅ 512MB RAM
- ✅ 自动 SSL 证书
- ⚠️ 15分钟无活动后休眠

**付费套餐**（可选）：
- $7/月 - 不休眠，更多资源
- 适合：高流量、需要实时响应的应用

---

## 📚 相关文档

- [Render 官方文档](https://render.com/docs)
- [Socket.IO 文档](https://socket.io/docs/v4/)
- [Node.js 部署最佳实践](https://nodejs.org/en/docs/guides/)
- [UptimeRobot 使用指南](https://uptimerobot.com/faq/)

---

## 🆘 需要帮助？

**遇到问题？按以下顺序检查**：

1. 📋 查看 Render Dashboard 的 Logs
2. 🔍 检查环境变量配置
3. 🌐 测试 /health 端点是否响应
4. 🔌 确认客户端能连接到服务器

---

**部署愉快！** 🚀✨

如有问题，随时查看 Render Dashboard 的实时日志。祝你和另一半玩得开心！🎮💕
