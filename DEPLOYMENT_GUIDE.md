# 🚀 卿轻游 - 完整部署指南

本文档提供从零开始部署卿轻游服务器和客户端的完整指南。

---

## 📋 目录

1. [架构概览](#架构概览)
2. [服务器部署](#服务器部署)
3. [客户端部署](#客户端部署)
4. [环境变量配置](#环境变量配置)
5. [常见问题](#常见问题)

---

## 🏗 架构概览

```
┌─────────────────┐
│  React Native   │ ← 移动端/Web端
│     客户端      │
└────────┬────────┘
         │ WebSocket (Socket.IO)
         ↓
┌─────────────────┐
│   Node.js +     │ ← 游戏服务器
│   Socket.IO     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Redis (Upstash)│ ← 状态存储（可选）
└─────────────────┘
```

---

## 🖥 服务器部署

### 方案一：Render.com（推荐 - 完全免费）

#### 优点
- ✅ 完全免费
- ✅ 自动 HTTPS
- ✅ 原生 WebSocket 支持
- ✅ GitHub 自动部署
- ✅ 零配置

#### 步骤

**1. 准备 Redis（可选）**

访问 [Upstash](https://upstash.com/)：
1. 注册免费账号
2. 创建 Redis 数据库（免费额度：10,000 条命令/天）
3. 获取连接信息并记录：
   ```
   REDIS_URL
   REDIS_HOST
   REDIS_PORT
   REDIS_PASSWORD
   ```

**2. 部署到 Render**

访问 [Render.com](https://render.com/)：

1. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接 GitHub 仓库
   - 选择 `couple-game-rn` 仓库

2. **配置服务**
   ```
   Name: couple-game-server
   Root Directory: server
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

3. **添加环境变量**
   ```
   NODE_ENV=production
   PORT=3001
   ```

   如果使用 Redis：
   ```
   REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
   REDIS_HOST=xxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

4. **部署**
   - 点击 "Create Web Service"
   - 等待 2-3 分钟完成部署
   - 获取服务器 URL：`https://your-app.onrender.com`

**3. 测试服务器**
```bash
curl https://your-app.onrender.com/health
```

应该返回：
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 方案二：Railway.app（更好性能，需信用卡）

#### 使用 CLI 部署

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 进入 server 目录
cd server

# 初始化项目
railway init

# 部署
railway up

# 添加环境变量
railway variables set NODE_ENV=production
railway variables set REDIS_URL=your-redis-url

# 获取部署 URL
railway domain
```

---

### 方案三：Fly.io（全球 CDN，不休眠）

#### 使用 CLI 部署

```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 进入 server 目录
cd server

# 启动部署
fly launch

# 设置环境变量
fly secrets set REDIS_URL=your-redis-url

# 部署
fly deploy
```

---

## 📱 客户端部署

### Web 版本 - GitHub Pages（自动部署）

已在工作流中配置，每次推送 tag 时自动部署。

**访问地址：**
```
https://<username>.github.io/<repo-name>/
```

**手动触发：**
```bash
# 推送 tag
git tag v1.0.5
git push origin v1.0.5
```

### Android APK

从 GitHub Releases 下载 `couple-game.apk`

### iOS IPA（未签名）

从 GitHub Releases 下载 `couple-game-unsigned.ipa`，使用以下工具安装：
- AltStore
- Sideloadly
- 轻松签
- 巨魔商店

---

## ⚙️ 环境变量配置

### 服务器环境变量（server/.env）

```bash
# 必需
NODE_ENV=production
PORT=3001

# Redis（如果使用）
REDIS_URL=redis://default:password@host:port
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 客户端环境变量（.env）

```bash
# Socket.IO 服务器地址
EXPO_PUBLIC_SOCKET_URL=https://your-server.onrender.com
```

**注意：** 修改后需要重新构建客户端！

---

## 🔧 部署后配置

### 1. 更新客户端 Socket URL

**方式一：通过应用内设置**
1. 打开应用
2. 进入"设置" → "网络设置"
3. 启用"在线模式"
4. 点击"Socket 地址"
5. 输入服务器地址：`https://your-server.onrender.com`
6. 保存

**方式二：通过环境变量（重新构建）**
1. 创建 `.env` 文件
2. 添加：`EXPO_PUBLIC_SOCKET_URL=https://your-server.onrender.com`
3. 重新构建应用

### 2. 防止服务器休眠（Render 免费版）

Render 免费版会在 15 分钟无活动后休眠。使用以下服务保持唤醒：

**UptimeRobot（推荐）**
1. 访问 [UptimeRobot](https://uptimerobot.com/)
2. 创建免费账号
3. 添加监控：
   - Monitor Type: HTTP(s)
   - URL: `https://your-server.onrender.com/health`
   - Interval: 5 分钟
4. 保存

**Cron-job.org（备选）**
1. 访问 [Cron-job.org](https://cron-job.org/)
2. 创建账号
3. 添加定时任务
4. URL: `https://your-server.onrender.com/health`
5. 间隔: 每 14 分钟

---

## 📊 监控和维护

### 健康检查端点

```bash
# 基本健康检查
GET https://your-server.onrender.com/health

# 服务器统计
GET https://your-server.onrender.com/stats

# 服务器信息
GET https://your-server.onrender.com/
```

### 查看日志

**Render:**
- Dashboard → Services → 选择服务 → Logs

**Railway:**
```bash
railway logs
```

**Fly.io:**
```bash
fly logs
```

---

## 🐛 常见问题

### 1. 客户端连接服务器失败

**原因：**
- 服务器地址错误
- 服务器休眠中（Render 免费版）
- CORS 配置问题

**解决：**
```bash
# 检查服务器状态
curl https://your-server.onrender.com/health

# 检查 Socket URL 配置
# 应用设置 → 网络设置 → Socket 地址
```

### 2. 服务器频繁休眠

**解决：** 使用 UptimeRobot 定期 ping 服务器（见上文）

### 3. Redis 连接失败

**检查：**
```bash
# 确认环境变量正确设置
echo $REDIS_URL
echo $REDIS_HOST
echo $REDIS_PORT
```

### 4. Web 版本部署失败

**检查：**
1. GitHub Pages 是否启用
2. 工作流是否成功运行
3. Settings → Pages → Source = "GitHub Actions"

### 5. Socket.IO 连接超时

**原因：**
- 网络问题
- 服务器过载
- WebSocket 不支持

**解决：**
```javascript
// 增加超时时间
const socket = io(url, {
  timeout: 20000,
  transports: ['websocket', 'polling']
});
```

---

## 🚀 快速开始脚本

### 服务器部署
```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

### 本地开发
```bash
# 服务器
cd server
npm install
npm run dev

# 客户端
npm install
npm start
```

---

## 📈 性能优化建议

### 服务器
1. **启用压缩**
   ```javascript
   import compression from 'compression'
   app.use(compression())
   ```

2. **限制 CORS**
   ```javascript
   cors: {
     origin: ['https://yourdomain.com'],
     methods: ['GET', 'POST']
   }
   ```

3. **添加速率限制**
   ```bash
   npm install express-rate-limit
   ```

### 客户端
1. **优化图片** - 使用 WebP 格式
2. **代码分割** - 懒加载路由
3. **缓存策略** - 缓存静态资源

---

## 🎯 生产检查清单

部署前确认：

- [ ] 服务器已部署并可访问
- [ ] Redis 已配置（如需要）
- [ ] 环境变量已正确设置
- [ ] 健康检查端点正常
- [ ] Socket.IO 连接正常
- [ ] CORS 配置正确
- [ ] 防休眠监控已设置（Render）
- [ ] 日志监控已启用
- [ ] 客户端 Socket URL 已更新
- [ ] Web 版本已部署到 GitHub Pages
- [ ] APK/IPA 已上传到 Releases

---

## 📞 技术支持

如遇问题：
1. 检查服务器日志
2. 检查客户端控制台
3. 查看 GitHub Issues
4. 参考本文档的常见问题部分

---

## 🎉 完成！

现在您的应用已完全部署到云端，可以：
- ✅ Web 端访问：`https://<username>.github.io/<repo-name>/`
- ✅ 移动端连接：下载 APK/IPA
- ✅ 在线游戏：通过 Socket.IO 实时对战

Happy Gaming! 🎮
