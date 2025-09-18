#!/bin/bash

# 打包 React Native Expo 应用
# 作者: Claude
# 日期: $(date '+%Y-%m-%d')

echo "📦 正在打包 Couple Game RN 应用..."

# 设置环境变量
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export NODE_ENV=production

# 检查Java环境
echo "📋 检查Java环境..."
java -version

# 类型检查
echo "🔍 执行类型检查..."
npx tsc --noEmit --skipLibCheck
if [ $? -ne 0 ]; then
    echo "❌ 类型检查失败，请修复错误后重试"
    exit 1
fi

# ESLint检查
echo "🔍 执行代码规范检查..."
npx eslint . --ext .js,.jsx,.ts,.tsx
if [ $? -ne 0 ]; then
    echo "⚠️  代码规范检查有警告，但继续打包..."
fi

# 选择打包方式
echo "请选择打包方式:"
echo "1) 本地打包 (local)"
echo "2) EAS云端打包 (cloud)"
read -p "请输入选择 (1/2): " choice

case $choice in
    1)
        echo "🏗️  开始本地打包..."
        npx eas build --platform android --profile preview --local
        ;;
    2)
        echo "☁️  开始云端打包..."
        npx eas build --platform android --profile preview
        ;;
    *)
        echo "❌ 无效选择，默认使用云端打包..."
        npx eas build --platform android --profile preview
        ;;
esac

if [ $? -eq 0 ]; then
    echo "✅ 打包完成！"
    echo "📱 APK文件位置: 请查看构建完成后的输出信息"
else
    echo "❌ 打包失败，请检查错误信息"
    exit 1
fi