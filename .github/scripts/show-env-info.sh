#!/bin/bash

set -e  # 遇到错误立即退出

echo "🔍 显示构建环境信息..."

echo "=== 基本环境信息 ==="
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "当前目录: $(pwd)"
echo "操作系统: $(uname -a)"

# 如果是 macOS，显示 macOS 和 Xcode 信息
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS: $(sw_vers -productVersion)"
    if command -v xcodebuild &> /dev/null; then
        echo "Xcode: $(xcodebuild -version | head -1)"
        echo "Xcode 路径: $(xcode-select --print-path)"
    fi
fi

echo ""
echo "=== 项目文件检查 ==="
echo "目录内容:"
ls -la

echo ""
echo "=== 配置文件检查 ==="
[ -f package.json ] && echo "✅ package.json 存在" || echo "❌ package.json 不存在"
[ -f eas.json ] && echo "✅ eas.json 存在" || echo "❌ eas.json 不存在"
[ -f app.json ] && echo "✅ app.json 存在" || echo "❌ app.json 不存在"
[ -f app.config.js ] && echo "✅ app.config.js 存在" || echo "❌ app.config.js 不存在"

echo ""
echo "=== Expo 配置检查 ==="
if command -v npx &> /dev/null; then
    echo "尝试运行 expo config..."
    npx expo config --type public 2>/dev/null || {
        echo "⚠️ expo config 失败，尝试基础命令..."
        npx expo config 2>/dev/null || echo "❌ expo config 完全失败"
    }
else
    echo "❌ npx 不可用"
fi

echo ""
echo "🎯 环境信息显示完成"