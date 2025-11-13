# GitHub Actions 三端打包配置说明（EAS Build）

## 🚀 功能说明

这个 GitHub Actions workflow 使用最新的 EAS Build 自动构建并发布你的 React Native Expo 应用到三个平台：
- 📱 **Android APK**
- 🍎 **iOS IPA**（无签名）
- 🌐 **Web 版本**

## 🔧 配置要求

### 必需的 GitHub Secrets

在你的 GitHub 仓库设置中添加以下 Secrets：

#### 1. Expo Token（必需）
```
EXPO_TOKEN
```
- 获取方式：访问 https://expo.dev/accounts/[username]/settings/access-tokens
- 创建新的访问令牌并复制

> **注意**: 现在使用 EAS Build 替代废弃的 `expo build` 命令。iOS 构建为无签名模式，可在下载后自行签名。

## 📁 必需的配置文件

### EAS Build 配置 (eas.json)
项目中已包含 `eas.json` 配置文件，定义了三种构建配置：

- **development**: 开发环境构建
- **preview**: 预览版本构建（用于 CI/CD）
- **production**: 生产版本构建

## 🎯 触发方式

### 1. 自动触发（推荐）
- **Tag推送**: `git tag v1.0.0 && git push origin v1.0.0` → 正式版本
- **Main分支推送**: 提交到main分支 → 开发版本（prerelease）

### 2. 手动触发
在 GitHub 仓库的 Actions 页面，点击 "Build and Release" workflow，然后点击 "Run workflow"

## 📦 构建产物

成功构建后，会在 GitHub Releases 中创建新版本，包含：

- `couple-game-android.apk` - Android 安装包
- `couple-game-ios-unsigned.ipa` - iOS 无签名安装包（需要自行签名）
- `couple-game-web.zip` - Web 版本压缩包

## 🍎 iOS 签名说明

下载的 iOS IPA 文件是无签名的，你需要使用以下方法之一进行签名：

### 方法1: 使用 Xcode
1. 在 Xcode 中打开项目
2. 配置你的开发者证书和 Provisioning Profile
3. Archive 并导出签名的 IPA

### 方法2: 使用 iOS App Signer
1. 下载 [iOS App Signer](https://github.com/DanTheMan827/ios-app-signer)
2. 选择无签名的 IPA 文件
3. 选择你的证书和 Provisioning Profile
4. 点击 "Start" 生成签名的 IPA

### 方法3: 使用命令行工具
```bash
# 使用 codesign 签名
codesign -f -s "iPhone Developer: Your Name" --entitlements entitlements.plist couple-game-unsigned.ipa
```

## 🛠️ 本地测试命令

在配置 workflow 之前，可以先在本地测试构建命令：

```bash
# 安装 EAS CLI
npm install -g @expo/eas-cli

# 登录 Expo
eas login

# 测试 Web 构建
npx expo export --platform web

# 测试 Android 构建（使用 EAS）
eas build --platform android --profile preview

# 测试 iOS 构建（使用 EAS）
eas build --platform ios --profile preview
```

## 📋 配置检查清单

- [ ] 添加 `EXPO_TOKEN` 到 GitHub Secrets
- [ ] 确保 `eas.json` 配置文件存在
- [ ] 确保 `app.json` 或 `expo.json` 配置正确
- [ ] 测试本地 EAS 构建命令正常工作
- [ ] 推送代码并创建 tag 触发构建
- [ ] （iOS）准备好证书和 Provisioning Profile 用于后续签名

## ❗ 注意事项

1. **EAS Build**: 现在使用 EAS Build 替代废弃的 `expo build` 命令
2. **iOS 构建**: 生成无签名 IPA，需要自行签名后才能安装
3. **Android 构建**: 使用 EAS Build 托管构建服务，生成 APK 格式
4. **Web 构建**: 使用 `expo export --platform web` 生成静态文件
5. 首次构建可能需要较长时间，EAS 有并发构建限制
6. 确保 `package.json` 中的依赖都是兼容的版本
7. 无签名的 iOS IPA 无法直接安装到设备，必须先签名

## 🔄 工作流程

1. 代码推送或手动触发
2. 并行使用 EAS Build 构建 Android 和 iOS
3. 使用 expo export --platform web 构建 Web 版本
4. 上传构建产物作为 artifacts
5. 创建 GitHub Release
6. 将所有构建产物附加到 Release

## 🆘 故障排除

- **EAS Build 失败**：检查 Expo token 是否有效，确保有 EAS 构建权限
- **依赖错误**：确保 `yarn.lock` 是最新的，所有依赖都支持 EAS Build
- **构建超时**：EAS Build 有时间限制，复杂项目可能需要优化
- **配置错误**：检查 `eas.json` 和 `app.json` 配置
- **权限问题**：确保 Expo token 有足够权限进行构建

## 🔗 相关链接

- [EAS Build 官方文档](https://docs.expo.dev/build/introduction/)
- [从 Expo CLI 迁移到 EAS Build](https://docs.expo.dev/build-reference/migrating/)
- [EAS Build 配置参考](https://docs.expo.dev/build-reference/eas-json/)