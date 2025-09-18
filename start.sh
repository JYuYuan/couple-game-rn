#!/bin/bash

# 启动 React Native Expo 应用
# 作者: Claude
# 日期: $(date '+%Y-%m-%d')

echo "🚀 正在启动 卿轻游 应用..."

# 设置环境变量
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

# 检查Java环境
echo "📋 检查Java环境..."
java -version

# 检查Android设备连接
echo "📱 检查Android设备..."
adb devices

# 清除缓存并启动
echo "🧹 清除缓存并启动应用..."
npx expo start --clear --port 8082

echo "✅ 应用启动完成！"