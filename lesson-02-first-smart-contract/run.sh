#!/bin/bash

# 第2课：第一个智能合约 - 运行脚本

echo "🎓 第2课：第一个智能合约 - 存钱罐"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --silent
    echo "✅ 依赖安装完成"
    echo ""
fi

echo "🚀 运行智能合约测试..."
echo ""

# 运行测试
npx hardhat test test.js

echo ""
echo "========================================"
echo "✅ 完成！"
echo ""
echo "💡 试试这些："
echo "1. 修改 PiggyBank.sol 中的逻辑"
echo "2. 在 test.js 中添加更多测试"
echo "3. 试试添加'查看存款历史'功能"
echo ""
echo "📖 详细说明请看 README.md"
