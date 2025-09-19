# GitHub Actions Workflow 优化

## 📋 优化概述

原始 workflow 有 532 行，包含大量重复和冗长的脚本。现在已优化为：
- **简化的 workflow**: 123 行 (减少 77%)
- **模块化脚本**: 5 个独立的 shell 脚本

## 📁 文件结构

```
.github/
├── scripts/
│   ├── show-env-info.sh      # 环境信息显示
│   ├── install-deps.sh       # 依赖安装
│   ├── build-android.sh      # Android APK 构建
│   ├── build-ios.sh          # iOS IPA 构建
│   └── create-release.sh     # GitHub Release 创建
└── workflows/
    ├── build-and-release.yml           # 原始 workflow (备份)
    └── build-and-release-optimized.yml # 优化版本
```

## 🔧 各脚本功能

### 1. `show-env-info.sh`
- 显示 Node.js、NPM、Xcode 版本
- 检查项目配置文件
- Expo 配置验证
- 支持 Linux 和 macOS

### 2. `install-deps.sh`
- 清理旧的构建文件
- 安装项目依赖 (yarn)
- 安装全局工具 (eas-cli, expo-cli)
- 统一的依赖管理

### 3. `build-android.sh`
- Android 环境检查
- Expo 预构建
- EAS 本地构建
- APK 文件验证

### 4. `build-ios.sh`
- Xcode 环境设置
- CocoaPods 依赖安装
- 未签名 archive 构建
- IPA 提取和打包

### 5. `create-release.sh`
- 查找构建产物
- 生成更新日志
- 创建 GitHub Release
- 自动文件上传

## 🚀 使用方法

### 切换到优化版本
```bash
# 备份原始文件
mv .github/workflows/build-and-release.yml .github/workflows/build-and-release-backup.yml

# 使用优化版本
mv .github/workflows/build-and-release-optimized.yml .github/workflows/build-and-release.yml
```

### 本地测试脚本
```bash
# 测试环境信息
./.github/scripts/show-env-info.sh

# 测试依赖安装
./.github/scripts/install-deps.sh

# 测试 Android 构建
./.github/scripts/build-android.sh

# 测试 iOS 构建 (仅 macOS)
./.github/scripts/build-ios.sh
```

## ✨ 优化效果

### 可读性提升
- ✅ 减少 77% 的 workflow 代码量
- ✅ 逻辑清晰，易于理解
- ✅ 模块化设计，职责分离

### 维护性提升
- ✅ 脚本可独立测试和调试
- ✅ 错误处理集中化
- ✅ 配置变更只需修改对应脚本

### 复用性提升
- ✅ 脚本可在本地开发中使用
- ✅ 其他项目可复用相同脚本
- ✅ CI/CD 流程标准化

## 🛠️ 扩展建议

### 1. 添加更多平台支持
```bash
# 可以添加 Web 构建脚本
./.github/scripts/build-web.sh
```

### 2. 添加测试脚本
```bash
# 自动化测试
./.github/scripts/run-tests.sh
```

### 3. 添加代码质量检查
```bash
# ESLint + Prettier
./.github/scripts/lint-and-format.sh
```

## 📝 注意事项

1. **权限**: 确保所有脚本都有执行权限
2. **环境**: 脚本使用 `set -e` 确保错误时立即退出
3. **日志**: 所有脚本都包含详细的输出信息
4. **兼容性**: 脚本兼容 Ubuntu 和 macOS 环境

## 🔄 回滚方案

如果需要回到原始版本：
```bash
mv .github/workflows/build-and-release.yml .github/workflows/build-and-release-optimized.yml
mv .github/workflows/build-and-release-backup.yml .github/workflows/build-and-release.yml
```