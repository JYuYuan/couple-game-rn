#!/bin/bash

set -e

echo "🏗️ 开始构建未签名 iOS IPA..."

# 检查必要的环境
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ xcodebuild 不可用"
    exit 1
fi

# 检查 Expo CLI
if ! command -v npx &> /dev/null; then
    echo "❌ npx 不可用"
    exit 1
fi

# 设置 Xcode
echo "设置 Xcode 环境..."
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version

# 显示当前环境信息
echo "当前工作目录: $(pwd)"
echo "项目文件:"
ls -la

# Expo 预构建
echo "📦 Expo 预构建..."
npx expo prebuild --platform ios --clean

# 验证 iOS 目录是否存在
if [ ! -d "ios" ]; then
    echo "❌ iOS 目录不存在，预构建可能失败"
    exit 1
fi

# 安装 CocoaPods 依赖
echo "📦 安装 CocoaPods 依赖..."
cd ios

# 确保有最新的 CocoaPods
if ! command -v pod &> /dev/null; then
    echo "安装 CocoaPods..."
    gem install cocoapods
fi

pod install
cd ..

# 创建构建目录
mkdir -p ./build

# 进入 iOS 目录开始构建
cd ios

# 项目配置
WORKSPACE="couplegamern.xcworkspace"
SCHEME_NAME="couplegamern"

echo "使用 workspace: $WORKSPACE"
echo "使用 scheme: $SCHEME_NAME"

# 验证配置
echo "可用的 schemes:"
xcodebuild -list -workspace "$WORKSPACE" 2>/dev/null | grep -A 10 "Schemes:" || true

# 验证 workspace 文件存在
if [ ! -d "$WORKSPACE" ]; then
    echo "❌ 错误: workspace '$WORKSPACE' 不存在"
    echo "当前目录: $(pwd)"
    echo "当前目录内容:"
    ls -la
    exit 1
fi

# 构建 archive（未签名）
echo "🔨 开始构建 archive（未签名）..."

# 设置正确的路径
ARCHIVE_PATH="../build/$SCHEME_NAME.xcarchive"

# 确保构建目录存在
mkdir -p ../build

xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME_NAME" \
    -configuration Release \
    -destination generic/platform=iOS \
    -archivePath "$ARCHIVE_PATH" \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    PROVISIONING_PROFILE_SPECIFIER="" \
    DEVELOPMENT_TEAM="" \
    | tee ../build/build.log

# 检查构建是否成功
if [ ! -d "$ARCHIVE_PATH" ]; then
    echo "❌ 构建失败，archive 不存在"
    echo "构建日志（最后 20 行）："
    tail -20 ../build/build.log || true
    echo ""
    echo "当前目录: $(pwd)"
    echo "当前目录内容："
    ls -la
    echo ""
    echo "预期 archive 路径: $ARCHIVE_PATH"
    echo "构建目录内容："
    ls -la ../build/ || true
    exit 1
fi

echo "✅ Archive 构建成功！"

# 回到构建目录
cd ../build

echo "📦 从 archive 提取 APP..."

# 从 xcarchive 中提取 .app
APP_PATH=$(find "$SCHEME_NAME.xcarchive/Products/Applications" -name "*.app" | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ 在 archive 中未找到 .app 文件"
    echo "Archive 结构："
    find "$SCHEME_NAME.xcarchive" -type d -name "*.app"
    exit 1
fi

echo "找到 APP: $APP_PATH"
APP_NAME=$(basename "$APP_PATH")

# 创建 IPA 结构
echo "创建 IPA 结构..."
mkdir -p Payload
cp -r "$APP_PATH" Payload/

# 创建 IPA（就是一个 zip 文件）
echo "压缩为 IPA..."
zip -r "couple-game-unsigned.ipa" Payload/

# 验证 IPA 创建成功
if [ ! -f "couple-game-unsigned.ipa" ]; then
    echo "❌ IPA 创建失败"
    ls -la
    exit 1
fi

echo ""
echo "✅ 未签名 IPA 构建成功！"
echo "文件位置: $(realpath couple-game-unsigned.ipa)"
echo "文件大小: $(du -h couple-game-unsigned.ipa | cut -f1)"
ls -la couple-game-unsigned.ipa

# 验证 IPA 结构
echo ""
echo "📦 IPA 内部结构验证："
unzip -l couple-game-unsigned.ipa | head -10

echo ""
echo "🎉 iOS 未签名 IPA 构建完成！"