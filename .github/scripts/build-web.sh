#!/bin/bash
set -e

echo "========================================"
echo "Building Web Application"
echo "========================================"

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
  echo "Error: node_modules not found. Please run install-deps.sh first"
  exit 1
fi

# 清理之前的构建
echo "Cleaning previous build..."
rm -rf dist web-build

# 导出 Web 应用
echo "Exporting web application..."
npx expo export --platform web

# 检查构建是否成功
if [ -d "dist" ]; then
  echo "✓ Web build successful!"
  echo "Build output: dist/"
  ls -lh dist/
else
  echo "✗ Web build failed - dist directory not found"
  exit 1
fi

echo "========================================"

echo "Web Build Complete!"

echo "========================================"
