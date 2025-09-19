#!/bin/bash

set -e

echo "🧹 开始清理和安装依赖..."

# 完全清理
echo "清理旧的构建文件和依赖..."
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf ios/build
rm -f yarn.lock
rm -f package-lock.json

# 安装 yarn（如果还没有）
if ! command -v yarn &> /dev/null; then
    echo "安装 yarn..."
    npm install -g yarn
fi

# 安装项目依赖
echo "安装项目依赖..."
yarn install

# 安装全局工具
echo "安装全局工具..."
npm install -g eas-cli@latest
npm install -g expo-cli@latest

echo "已安装的全局包:"
npm list -g --depth=0 | grep -E "(eas-cli|expo-cli)" || echo "未找到相关全局包"

echo "✅ 依赖安装完成"