#!/bin/bash

# 第1课：区块链基础 - 运行脚本

echo "🎓 第1课：什么是区块链？"
echo "================================"
echo ""

# 检查 Go 是否安装
if ! command -v go &> /dev/null; then
    echo "❌ 错误：未检测到 Go"
    echo "请先安装 Go: https://golang.org/dl/"
    exit 1
fi

echo "✅ Go 版本: $(go version)"
echo ""
echo "🚀 运行区块链模拟程序..."
echo ""

# 运行 Go 程序
go run main.go

echo ""
echo "================================"
echo "✅ 完成！"
echo ""
echo "💡 试试这些："
echo "1. 修改 main.go 中的交易金额"
echo "2. 添加更多区块"
echo "3. 观察篡改后的验证结果"
