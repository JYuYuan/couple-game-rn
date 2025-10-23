# 卿轻游 - 情侣互动游戏

一款为情侣设计的多人互动游戏应用，支持飞行棋、转盘、扫雷等多种游戏模式，提供线上和线下两种游戏方式。

## ✨ 功能特性

- 🎮 **多种游戏模式**
  - 飞行棋：经典棋盘游戏
  - 转盘：趣味抽奖
  - 扫雷对战：双人竞技

- 🌐 **多平台支持**
  - iOS 应用
  - Android 应用
  - Web 网页版

- 🔌 **双模式游戏**
  - 线下模式：本地多人游戏
  - 线上模式：通过服务器实时对战

- 🎯 **任务系统**
  - 自定义任务集
  - 丰富的任务类型
  - 难度分级系统

- 🌍 **国际化支持**
  - 中文（简体）
  - English

## 🚀 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/couple-game-rn.git
cd couple-game-rn

# 安装依赖
npm install

# 启动开发服务器
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### 服务器部署

详细部署指南请查看：[📖 部署指南](./DEPLOYMENT_GUIDE.md)

**快速部署到 Render.com（免费）：**

```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

## 📦 下载安装

### 从 GitHub Releases 下载

前往 [Releases](https://github.com/yourusername/couple-game-rn/releases) 页面下载最新版本：

- **Android**: `couple-game.apk`
- **iOS**: `couple-game-unsigned.ipa` (需要签名工具安装)
- **Web**: 在线访问或下载 `couple-game-web.zip` 离线部署

### Web 在线体验

访问：`https://yourusername.github.io/couple-game-rn/`

## 🛠 技术栈

### 客户端
- **框架**: React Native + Expo
- **路由**: Expo Router
- **状态管理**: Zustand
- **国际化**: i18next
- **UI**: React Native Reanimated + Expo Vector Icons
- **网络**: Socket.IO Client

### 服务器
- **运行时**: Node.js
- **框架**: Express
- **实时通信**: Socket.IO
- **数据存储**: Redis (Upstash)
- **语言**: TypeScript

## 📱 支持的平台

| 平台 | 支持状态 | 备注 |
|------|---------|------|
| iOS | ✅ 支持 | 需要 iOS 13.0+ |
| Android | ✅ 支持 | 需要 Android 5.0+ |
| Web | ✅ 支持 | 现代浏览器 |

## 🔧 项目结构

```
couple-game-rn/
├── app/                    # 应用页面
│   ├── (tabs)/            # Tab 导航页面
│   └── _layout.tsx        # 根布局
├── components/            # 可复用组件
├── constants/             # 常量配置
├── hooks/                 # 自定义 Hooks
├── i18n/                  # 国际化配置
├── services/              # 业务服务
├── store/                 # 状态管理
├── types/                 # TypeScript 类型
├── server/                # Socket.IO 服务器
│   ├─ core/             # 核心游戏逻辑
│   ├── games/            # 游戏实现
│   └── index.ts          # 服务器入口
└── .github/              # GitHub Actions 工作流
    └── workflows/        # CI/CD 配置
```

## 📖 文档

- [部署指南](./DEPLOYMENT_GUIDE.md) - 服务器和客户端部署
- [服务器文档](./server/DEPLOYMENT.md) - 服务器配置详情
- [服务器 README](./server/README.md) - 游戏模拟器使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🎯 路线图

- [ ] 更多游戏模式
- [ ] 排行榜系统
- [ ] 社交功能
- [ ] 成就系统
- [ ] 皮肤商店
- [ ] 语音聊天

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues: [创建 Issue](https://github.com/yourusername/couple-game-rn/issues)
- Email: your-email@example.com

---

Made with ❤️ for couples
