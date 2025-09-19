# GitHub Actions 自动构建和发布指南

## 🔧 前置条件设置

### 1. 设置 Repository Secrets

在 GitHub 仓库中设置以下 Secrets：

1. 前往 `Settings` > `Secrets and variables` > `Actions`
2. 添加以下 New repository secret：

#### `EXPO_TOKEN` (必需)
```bash
# 登录 Expo CLI
npx expo login

# 生成访问令牌
npx expo whoami --json
```
将输出中的 `accessToken` 值添加为 `EXPO_TOKEN`

## 🚀 触发构建的方式

### 方式一：推送标签 (推荐)
```bash
# 创建并推送标签
git tag v1.0.1
git push origin v1.0.1
```

### 方式二：手动触发
1. 前往 GitHub 仓库的 `Actions` 标签页
2. 选择 `Build and Release` workflow
3. 点击 `Run workflow`
4. 输入版本号 (例如：v1.0.1)
5. 点击 `Run workflow`

## 📦 构建流程

workflow 将执行以下步骤：

1. **环境设置**
   - Node.js 20
   - Java 17 (Temurin)
   - Android SDK (API 34)

2. **代码检查**
   - TypeScript 类型检查
   - ESLint 代码规范检查

3. **本地构建**
   - 使用 `eas build --local` 进行本地构建
   - 生成 Android APK 文件

4. **自动发布**
   - 创建 GitHub Release
   - 上传 APK 文件
   - 生成详细的 Release Notes

## 📱 构建产物

- **文件类型**: Android APK
- **下载位置**: GitHub Releases 页面
- **文件命名**: 自动生成 (包含版本和构建信息)

## 🔍 故障排除

### 构建失败可能的原因：

1. **EXPO_TOKEN 未设置或已过期**
   - 重新生成并更新 Secret

2. **类型检查失败**
   - 本地运行 `npx tsc --noEmit --skipLibCheck`
   - 修复类型错误后重新推送

3. **依赖安装失败**
   - 检查 `package.json` 和 `package-lock.json`
   - 确保所有依赖都是有效的

### 查看构建日志：
1. 前往 GitHub Actions 页面
2. 点击失败的 workflow 运行
3. 查看具体步骤的错误信息

## 📝 自定义配置

### 修改构建配置
编辑 `.github/workflows/build-and-release.yml` 文件：

- **Android API 版本**: 修改 `api-level` 和 `build-tools`
- **Node.js 版本**: 修改 `node-version`
- **构建配置**: 修改 `eas build` 参数

### 自定义 Release Notes
修改 workflow 文件中的 `RELEASE_NOTES` 部分。

## 🎯 最佳实践

1. **版本标签格式**: 使用语义化版本 (v1.0.0, v1.0.1, v2.0.0)
2. **提交信息**: 写清楚的提交信息，便于生成 Release Notes
3. **测试**: 推送标签前确保本地构建成功
4. **备份**: 重要版本建议手动备份 APK 文件

---
