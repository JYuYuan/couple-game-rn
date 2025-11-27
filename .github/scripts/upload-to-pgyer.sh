#!/bin/bash

# 上传应用到蒲公英平台并获取下载二维码
# 参数: $1 = 文件路径 (APK/IPA), $2 = 平台类型 (android/ios)

# 注意: 不使用 set -e，上传失败不影响打包流程

DANDELION_TOKEN="bf1954fd73fdcdccf1f2e8c5e046592f"
FILE_PATH="$1"
PLATFORM="$2"

if [ -z "$FILE_PATH" ] || [ -z "$PLATFORM" ]; then
    echo "⚠️ Usage: $0 <file_path> <platform>"
    echo "   platform: android or ios"
    echo "⚠️ Skipping upload due to missing parameters"
    exit 0
fi

if [ -z "$DANDELION_TOKEN" ]; then
    echo "⚠️ DANDELION_TOKEN is not set"
    echo "⚠️ Skipping upload"
    exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
    echo "⚠️ File not found: $FILE_PATH"
    echo "⚠️ Skipping upload"
    exit 0
fi

echo "📦 Uploading $PLATFORM build to Pgyer..."
echo "   File: $FILE_PATH"

# 上传到蒲公英
UPLOAD_RESPONSE=$(curl -s -X POST \
    "https://www.pgyer.com/apiv2/app/upload" \
    -F "_api_key=$DANDELION_TOKEN" \
    -F "file=@$FILE_PATH" \
    -F "buildUpdateDescription=GitHub Actions 自动构建")

# 解析响应（添加错误处理）
CODE=$(echo "$UPLOAD_RESPONSE" | jq -r '.code' 2>/dev/null || echo "PARSE_ERROR")

if [ "$CODE" == "PARSE_ERROR" ]; then
    echo "⚠️ Failed to parse API response (invalid JSON)"
    echo "⚠️ Raw response:"
    echo "$UPLOAD_RESPONSE"
    echo "⚠️ Skipping upload - build will continue"
    exit 0
fi

if [ "$CODE" != "0" ]; then
    echo "⚠️ Upload failed!"
    echo "$UPLOAD_RESPONSE" | jq . 2>/dev/null || echo "$UPLOAD_RESPONSE"
    echo "⚠️ Skipping upload - build will continue"
    exit 0
fi

# 提取关键信息
BUILD_KEY=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.buildKey')
BUILD_VERSION=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.buildVersion')
BUILD_BUILD_VERSION=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.buildBuildVersion')
BUILD_QRCODE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.buildQRCodeURL')
BUILD_SHORT_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.buildShortcutUrl')

echo "✅ Upload successful!"
echo "   Version: $BUILD_VERSION ($BUILD_BUILD_VERSION)"
echo "   Build Key: $BUILD_KEY"
echo "   Short URL: https://www.pgyer.com/$BUILD_SHORT_URL"
echo "   QR Code: $BUILD_QRCODE_URL"

# 设置为最新版本
echo ""
echo "🔄 Setting as newest version..."

SET_NEWEST_RESPONSE=$(curl -s -X POST \
    "https://www.pgyer.com/apiv2/app/setNewestVersion" \
    -d "_api_key=$DANDELION_TOKEN" \
    -d "buildKey=$BUILD_KEY")

SET_CODE=$(echo "$SET_NEWEST_RESPONSE" | jq -r '.code' 2>/dev/null || echo "PARSE_ERROR")

if [ "$SET_CODE" == "0" ]; then
    echo "✅ Set as newest version successfully!"
else
    echo "⚠️ Failed to set as newest version (non-critical)"
    if [ "$SET_CODE" != "PARSE_ERROR" ]; then
        echo "$SET_NEWEST_RESPONSE" | jq . 2>/dev/null || echo "$SET_NEWEST_RESPONSE"
    fi
fi

# 输出到 GitHub Actions
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "${PLATFORM}_qrcode_url=$BUILD_QRCODE_URL" >> $GITHUB_OUTPUT
    echo "${PLATFORM}_short_url=https://www.pgyer.com/$BUILD_SHORT_URL" >> $GITHUB_OUTPUT
    echo "${PLATFORM}_build_key=$BUILD_KEY" >> $GITHUB_OUTPUT
    echo "${PLATFORM}_version=$BUILD_VERSION" >> $GITHUB_OUTPUT
fi

echo ""
echo "🎉 $PLATFORM upload complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
