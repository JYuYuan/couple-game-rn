#!/bin/bash

set -e

echo "📦 创建 GitHub Release..."

# 获取版本标签
if [ "$1" ]; then
    RELEASE_TAG="$1"
else
    echo "❌ 请提供 release 标签作为参数"
    echo "用法: $0 <tag>"
    exit 1
fi

echo "发布版本: $RELEASE_TAG"

# 查找构建产物
APK_FILE=$(find ./artifacts -name "*.apk" 2>/dev/null | head -1 || echo "")
IPA_FILE=$(find ./artifacts -name "*.ipa" 2>/dev/null | head -1 || echo "")

# 设置文件名
APK_NAME="couple-game.apk"
IPA_NAME="couple-game-unsigned.ipa"

if [ -n "$APK_FILE" ]; then
    APK_NAME=$(basename "$APK_FILE")
    echo "✅ 找到 Android APK: $APK_NAME"
else
    echo "⚠️ 未找到 Android APK"
fi

if [ -n "$IPA_FILE" ]; then
    IPA_NAME=$(basename "$IPA_FILE")
    echo "✅ 找到 iOS IPA: $IPA_NAME"
else
    echo "⚠️ 未找到 iOS IPA"
fi

# 获取更新日志
echo "生成更新日志..."
CHANGELOG=""
if [ -f CHANGELOG.txt ]; then
    CHANGELOG=$(cat CHANGELOG.txt)
else
    # 尝试生成简单的更新日志
    TAGS=($(git tag --sort=-creatordate))
    if [ ${#TAGS[@]} -gt 1 ]; then
        PREVIOUS_TAG=${TAGS[1]}
        CURRENT_TAG=${TAGS[0]}
        git log $PREVIOUS_TAG..$CURRENT_TAG --oneline > CHANGELOG.txt
        CHANGELOG=$(cat CHANGELOG.txt)
    else
        CHANGELOG="首次发布"
    fi
fi

# 生成 release notes
cat > release-notes.md << EOF
📱 **卿轻游 $RELEASE_TAG**

## 📱 安装说明
### Android
下载 \`$APK_NAME\` 文件并安装到 Android 设备

### iOS (未签名)
下载 \`$IPA_NAME\` 文件，需要通过 AltStore、Sideloadly 等工具安装到 iOS 设备

## 🔧 构建信息
- 构建时间: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
- 平台: Android + iOS (未签名)
- 构建方式: GitHub Actions 自动构建

## 📋 更新内容
$CHANGELOG

---
🤖 此版本由 GitHub Actions 自动构建
EOF

echo "Release Notes:"
cat release-notes.md

# 准备上传文件
UPLOAD_FILES=""
[ -f "$APK_FILE" ] && UPLOAD_FILES="$UPLOAD_FILES $APK_FILE"
[ -f "$IPA_FILE" ] && UPLOAD_FILES="$UPLOAD_FILES $IPA_FILE"

if [ -z "$UPLOAD_FILES" ]; then
    echo "❌ 没有找到要上传的文件"
    exit 1
fi

echo "准备上传的文件: $UPLOAD_FILES"

# 创建 GitHub Release
echo "创建 GitHub Release..."
gh release create "$RELEASE_TAG" \
    $UPLOAD_FILES \
    --title "🎮 卿轻游 $RELEASE_TAG" \
    --notes-file release-notes.md \
    --draft=false \
    --prerelease=false

echo "✅ Release 创建成功！"