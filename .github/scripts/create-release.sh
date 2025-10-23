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
WEB_DIR=$(find ./artifacts -type d -name "web-build" 2>/dev/null | head -1 || echo "")

# 设置文件名
APK_NAME="couple-game.apk"
IPA_NAME="couple-game-unsigned.ipa"
WEB_ZIP_NAME="couple-game-web.zip"

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

if [ -n "$WEB_DIR" ] && [ -d "$WEB_DIR" ]; then
    echo "✅ 找到 Web 构建目录，正在压缩..."
    cd ./artifacts
    zip -r "../$WEB_ZIP_NAME" web-build/
    cd ..
    WEB_ZIP_FILE="$WEB_ZIP_NAME"
    echo "✅ Web 构建已压缩: $WEB_ZIP_NAME"
else
    echo "⚠️ 未找到 Web 构建"
    WEB_ZIP_FILE=""
fi

# 获取更新日志
echo "生成更新日志..."
CHANGELOG=""
# 直接获取最后一条commit信息作为更新日志
echo "获取最新 commit 信息..."

LATEST_COMMIT=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")

if [ -n "$LATEST_COMMIT" ]; then
    CHANGELOG="新版本发布"
    echo "✅ 使用最新 commit: $LATEST_COMMIT"
else
    CHANGELOG="新版本发布"
    echo "⚠️  无法获取 commit 信息，使用默认描述"
fi


echo "生成的更新日志:"
echo "$CHANGELOG"

# 生成 release notes
cat > release-notes.md << EOF
📱 **卿轻游 $RELEASE_TAG**

## 📱 安装说明
### Android
下载 \`$APK_NAME\` 文件并安装到 Android 设备

### iOS (未签名)
下载 \`$IPA_NAME\` 文件，需要通过 AltStore、Sideloadly、轻松签、巨魔等（任一）工具安装到 iOS 设备

### Web 版本
- 在线访问：通过 GitHub Pages 在线使用
- 离线部署：下载 \`$WEB_ZIP_NAME\` 并解压到 Web 服务器

## 🔧 构建信息
- 构建时间: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
- 平台: Android + iOS (未签名) + Web
- 构建方式: GitHub Actions 自动构建

## 📋 更新内容
$CHANGELOG
EOF

# 如果有 commit 详情，添加折叠展开部分
if [ -n "$CHANGELOG" ]; then
cat >> release-notes.md << EOF

<details>
<summary>📝 查看详细提交记录</summary>

\`\`\`
$CHANGELOG
\`\`\`

</details>
EOF
fi

# 添加结尾
cat >> release-notes.md << EOF

---
🤖 此版本由 GitHub Actions 自动构建
EOF

echo "Release Notes:"
cat release-notes.md

# 准备上传文件
UPLOAD_FILES=""
[ -f "$APK_FILE" ] && UPLOAD_FILES="$UPLOAD_FILES $APK_FILE"
[ -f "$IPA_FILE" ] && UPLOAD_FILES="$UPLOAD_FILES $IPA_FILE"
[ -f "$WEB_ZIP_FILE" ] && UPLOAD_FILES="$UPLOAD_FILES $WEB_ZIP_FILE"

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