# GitHub Actions 三端打包配置说明

## 🚀 功能说明

这个 GitHub Actions workflow 可以自动构建并发布你的 React Native Expo 应用到三个平台：
- 📱 **Android APK**
- 🍎 **iOS IPA**
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

> **注意**: iOS 构建已配置为无签名模式，你可以在下载后自行签名，无需提供证书相关的 Secrets。

## 🎯 触发方式

### 1. 自动触发（推荐）
当你推送带有版本标签的 commit 时：
```bash
git tag v1.0.0
git push origin v1.0.0
```

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
# 测试 Web 构建
npx expo export:web

# 测试 Android 构建（需要 Expo CLI）
npx expo build:android --type apk

# 测试 iOS 构建（需要 Expo CLI）
npx expo build:ios --type archive
```

## 📋 配置检查清单

- [ ] 添加 `EXPO_TOKEN` 到 GitHub Secrets
- [ ] 确保 `app.json` 或 `expo.json` 配置正确
- [ ] 测试本地构建命令正常工作
- [ ] 推送代码并创建 tag 触发构建
- [ ] （iOS）准备好证书和 Provisioning Profile 用于后续签名

## ❗ 注意事项

1. **iOS 构建**生成无签名 IPA，需要自行签名后才能安装
2. **Android 构建**使用 Expo 托管构建服务
3. **Web 构建**会生成静态文件，可直接部署到任何 Web 服务器
4. 首次构建可能需要较长时间，后续构建会更快
5. 确保 `package.json` 中的依赖都是兼容的版本
6. 无签名的 iOS IPA 无法直接安装到设备，必须先签名

## 🔄 工作流程

1. 代码推送或手动触发
2. 并行构建三个平台
3. 上传构建产物作为 artifacts
4. 创建 GitHub Release
5. 将所有构建产物附加到 Release

## 🆘 故障排除

- **构建失败**：检查 Expo token 是否有效
- **iOS 构建失败**：检查证书和 Provisioning Profile
- **依赖错误**：确保 `yarn.lock` 是最新的
- **Expo 配置错误**：检查 `app.json` 配置