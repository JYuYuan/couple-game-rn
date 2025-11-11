# Couple Game Server

基于 Socket.IO 的实时多人游戏服务器

## 免费部署指南

### 方案：Render.com（推荐）

#### 步骤 1: 部署到 Render

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
```

6. 点击 "Create Web Service"
7. 等待部署完成（约 2-3 分钟）

#### 步骤 2: 获取服务器 URL

部署完成后，您会得到一个 URL，例如：
```
https://couple-game-server.onrender.com
```

#### 步骤 3: 更新客户端配置

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

### 数据存储说明
- **存储方式**: 内存存储（Map）
- **数据持久化**: 服务器重启后数据清空
- **适用场景**: 小型应用、情侣游戏（2-4 人）
- **优势**: 部署简单、无需额外服务、性能高

**重要提示**：由于使用内存存储，服务器重启或休眠唤醒后，游戏房间和玩家数据会丢失。这对于短期游戏会话是可接受的。

---

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务器端口 | `3001` |

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
2. 环境变量是否正确配置
3. Socket.IO 连接是否正常

---

## 性能优化建议

1. **配置 CORS** 限制允许的客户端域名
2. **添加速率限制** 防止滥用
3. **监控日志** 使用 Render 提供的日志功能
4. **定期清理** 使用自动清理功能移除不活跃的房间和玩家

---

Happy Gaming! 🎮
