# Couple Game Server

基于 Socket.IO 的实时多人游戏服务器

## 免费部署指南

### 方案：Render.com + Upstash Redis

#### 步骤 1: 准备 Upstash Redis

1. 访问 [Upstash](https://upstash.com/)
2. 创建免费账号
3. 创建一个 Redis 数据库
4. 获取连接信息：
   - `REDIS_URL`
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`

#### 步骤 2: 部署到 Render

1. 访问 [Render.com](https://render.com/)
2. 创建免费账号
3. 点击 "New +" → "Web Service"
4. 连接您的 GitHub 仓库
5. 配置如下：

**基本设置：**
- Name: `couple-game-server`
- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Plan: `Free`

**环境变量：**
```
NODE_ENV=production
PORT=3001
REDIS_URL=<从 Upstash 复制>
REDIS_HOST=<从 Upstash 复制>
REDIS_PORT=<从 Upstash 复制>
REDIS_PASSWORD=<从 Upstash 复制>
```

6. 点击 "Create Web Service"
7. 等待部署完成（约 2-3 分钟）

#### 步骤 3: 获取服务器 URL

部署完成后，您会得到一个 URL，例如：
```
https://couple-game-server.onrender.com
```

#### 步骤 4: 更新客户端配置

在 React Native 应用中，更新 Socket.IO 连接地址为 Render 提供的 URL。

---

## 其他免费部署选项

### Railway.app
```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 部署
railway up
```

### Fly.io
```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 部署
fly launch
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start
```

---

## 注意事项

### Render 免费套餐限制
- **自动休眠**: 15 分钟无活动后休眠
- **唤醒时间**: 首次访问需要 30-50 秒
- **运行时间**: 每月 750 小时

### 避免休眠的方法
可以使用免费的 Uptime 监控服务（如 UptimeRobot）每 14 分钟 ping 一次服务器。

### Upstash Redis 免费限制
- **命令数**: 10,000 条/天
- **存储**: 256MB
- **连接数**: 适合小型应用

---

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务器端口 | `3001` |
| `REDIS_URL` | Redis 完整连接 URL | `redis://default:xxx@xxx.upstash.io:6379` |
| `REDIS_HOST` | Redis 主机地址 | `xxx.upstash.io` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | `your-password` |

---

## 健康检查

服务器支持健康检查端点：
```
GET /
```

返回服务器状态信息。

---

## 技术支持

如遇问题，请检查：
1. Render 部署日志
2. Redis 连接是否正常
3. 环境变量是否正确配置

---

## 性能优化建议

1. **启用 Redis 持久化**（如果需要）
2. **配置 CORS** 限制允许的客户端域名
3. **添加速率限制** 防止滥用
4. **监控日志** 使用 Render 提供的日志功能

---

Happy Gaming! 🎮
