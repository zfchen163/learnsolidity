#!/bin/bash

# 第3课：用 Go 连接智能合约 - 运行脚本

echo "🎓 第3课：用 Go 连接智能合约"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查 Go
if ! command -v go &> /dev/null; then
    echo "❌ 错误：未检测到 Go"
    echo "请先安装 Go: https://golang.org/dl/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ Go 版本: $(go version | awk '{print $3}')"
echo ""

# 安装 Node.js 依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 Node.js 依赖..."
    npm install --silent
    echo ""
fi

# 下载 Go 依赖
echo "📦 下载 Go 依赖..."
go mod download
echo ""

# 启动本地区块链（后台运行）
echo "🚀 启动本地区块链..."
npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!
echo "   进程 ID: $HARDHAT_PID"

# 等待节点启动
echo "   等待节点启动..."
sleep 3

# 检查节点是否启动成功
if ! curl -s http://127.0.0.1:8545 > /dev/null; then
    echo "❌ 节点启动失败"
    kill $HARDHAT_PID 2>/dev/null
    exit 1
fi
echo "   ✅ 节点已启动在 http://127.0.0.1:8545"
echo ""

# 部署合约并生成 Go 绑定
echo "📝 部署合约并生成 Go 绑定..."
npx hardhat run deploy.js --network localhost
echo ""

# 运行 Go 程序
echo "🎯 运行 Go 程序..."
echo ""
go run main.go

# 清理
echo ""
echo "🧹 清理..."
kill $HARDHAT_PID 2>/dev/null
echo "   ✅ 已停止本地区块链"

echo ""
echo "========================================"
echo "✅ 完成！"
echo ""
echo "💡 生成的文件："
echo "   - contracts/PiggyBank.go (Go 绑定代码)"
echo "   - PiggyBank.abi (合约接口)"
echo "   - PiggyBank.bin (合约字节码)"
echo "   - contract_address.txt (合约地址)"
echo ""
echo "📖 详细说明请看 README.md"
