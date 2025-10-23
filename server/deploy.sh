#!/bin/bash

echo "🚀 Couple Game Server - 快速部署脚本"
echo "======================================"
echo ""

# 检查是否安装了必要的工具
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装，请先安装"
        return 1
    fi
    echo "✅ $1 已安装"
    return 0
}

echo "检查依赖工具..."
check_command "node"
check_command "npm"

echo ""
echo "请选择部署平台:"
echo "1. Render.com (推荐)"
echo "2. Railway.app"
echo "3. Fly.io"
echo "4. 本地开发"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📦 部署到 Render.com"
        echo "===================="
        echo ""
        echo "步骤："
        echo "1. 访问 https://render.com 并登录"
        echo "2. 点击 'New +' -> 'Web Service'"
        echo "3. 连接您的 GitHub 仓库"
        echo "4. 选择 server 目录"
        echo "5. 配置如下："
        echo "   - Build Command: npm install && npm run build"
        echo "   - Start Command: npm start"
        echo "   - Plan: Free"
        echo ""
        echo "6. 添加环境变量（从 Upstash 获取）："
        echo "   - REDIS_URL"
        echo "   - REDIS_HOST"
        echo "   - REDIS_PORT"
        echo "   - REDIS_PASSWORD"
        echo ""
        echo "7. 点击 'Create Web Service'"
        echo ""
        read -p "按回车键继续..."
        ;;
    2)
        echo ""
        echo "🚂 部署到 Railway.app"
        echo "===================="
        echo ""
        if ! check_command "railway"; then
            echo "正在安装 Railway CLI..."
            npm i -g @railway/cli
        fi
        echo ""
        echo "开始部署..."
        railway login
        railway up
        ;;
    3)
        echo ""
        echo "✈️  部署到 Fly.io"
        echo "================"
        echo ""
        if ! check_command "fly"; then
            echo "正在安装 Fly CLI..."
            curl -L https://fly.io/install.sh | sh
        fi
        echo ""
        echo "开始部署..."
        fly auth login
        fly launch
        ;;
    4)
        echo ""
        echo "💻 本地开发模式"
        echo "=============="
        echo ""
        echo "安装依赖..."
        npm install
        echo ""
        echo "启动开发服务器..."
        npm run dev
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "✅ 完成！"
