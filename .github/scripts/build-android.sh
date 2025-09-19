#!/bin/bash

set -e

echo "📱 构建 Android APK..."

# 检查必要文件
if [ ! -f "eas.json" ]; then
    echo "❌ eas.json 不存在"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi

# 检查 EAS CLI
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI 不可用"
    exit 1
fi

# 创建构建目录
mkdir -p ./build

echo "🏗️ 开始构建 Android APK..."

# 预构建
echo "📦 Android 预构建..."
npx expo prebuild --platform android --clean

# 构建 APK
echo "🔨 使用 EAS 构建 APK..."
eas build --platform android --profile preview --local --non-interactive --output ./build/couple-game.apk

# 查找生成的 APK
APK_FILE=$(find . -name "*.apk" -type f ! -path "./node_modules/*" | head -1)

if [ -z "$APK_FILE" ]; then
    echo "❌ 未找到 APK 文件"
    echo "查找所有 APK 文件："
    find . -type f -name "*.apk" 2>/dev/null || echo "没有找到任何 APK 文件"
    exit 1
fi

echo "✅ APK 构建成功！"
echo "文件位置: $(realpath $APK_FILE)"
echo "文件大小: $(du -h $APK_FILE | cut -f1)"
ls -la $APK_FILE

echo "🎉 Android APK 构建完成！"