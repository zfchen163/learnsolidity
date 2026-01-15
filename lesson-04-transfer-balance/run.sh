#!/bin/bash

echo "🎓 第4课：转账和余额查询"
echo "========================================"
echo ""

# 检查 Go
if ! command -v go &> /dev/null; then
    echo "❌ 错误：未检测到 Go"
    exit 1
fi

echo "✅ Go 版本: $(go version | awk '{print $3}')"
echo ""

# 下载依赖
echo "📦 下载 Go 依赖..."
go mod download
echo ""

# 启动本地区块链
echo "🚀 启动本地区块链..."
echo "   (使用 Hardhat 快速模式)"

# 创建临时 Hardhat 项目
if [ ! -f "package.json" ]; then
    cat > package.json << 'EOF'
{
  "name": "lesson-04",
  "devDependencies": {
    "hardhat": "^2.19.0"
  }
}
EOF
    npm install --silent
fi

if [ ! -f "hardhat.config.js" ]; then
    cat > hardhat.config.js << 'EOF'
module.exports = {
  networks: {
    hardhat: {
      chainId: 1337
    }
  }
};
EOF
fi

# 启动节点
npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!
sleep 3

echo "   ✅ 节点已启动"
echo ""

# 运行 Go 程序
echo "🎯 运行转账程序..."
echo ""
go run main.go

# 清理
echo ""
kill $HARDHAT_PID 2>/dev/null

echo "========================================"
echo "✅ 完成！"
echo ""
echo "📖 详细说明请看 README.md"
