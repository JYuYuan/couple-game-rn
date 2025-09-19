#!/bin/bash

echo "🧪 测试 GitHub Actions 脚本..."

# 测试环境信息脚本
echo ""
echo "=== 测试 show-env-info.sh ==="
if ./.github/scripts/show-env-info.sh; then
    echo "✅ show-env-info.sh 测试通过"
else
    echo "❌ show-env-info.sh 测试失败"
fi

# 测试 changelog 生成（模拟）
echo ""
echo "=== 测试 changelog 生成 ==="
TAGS=($(git tag --sort=-creatordate 2>/dev/null || echo ""))
echo "找到 ${#TAGS[@]} 个 tags: ${TAGS[@]}"

if [ ${#TAGS[@]} -gt 1 ]; then
    PREVIOUS_TAG=${TAGS[1]}
    CURRENT_TAG=${TAGS[0]}
    echo "测试对比 $PREVIOUS_TAG 到 $CURRENT_TAG"

    if git log "$PREVIOUS_TAG..$CURRENT_TAG" --oneline > test-changelog.txt 2>/dev/null; then
        echo "✅ changelog 生成测试通过"
        echo "生成了 $(wc -l < test-changelog.txt) 行更新日志"
    else
        echo "❌ changelog 生成测试失败"
    fi
    rm -f test-changelog.txt
else
    echo "✅ 处理少量 tags 的情况正常"
fi

# 测试基本 git 命令
echo ""
echo "=== 测试 git 命令兼容性 ==="
if git describe --tags 2>/dev/null; then
    echo "✅ git describe 正常"
else
    echo "⚠️ git describe 失败，但这是正常的"
fi

if git tag --list | head -3; then
    echo "✅ git tag 命令正常"
else
    echo "❌ git tag 命令失败"
fi

echo ""
echo "🎯 所有测试完成！"