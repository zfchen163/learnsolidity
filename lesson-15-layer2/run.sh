#!/bin/bash
echo "安装依赖..."
npm install

echo "编译合约..."
npx hardhat compile

echo "--- 准备就绪 ---"
echo "要在 Layer 2 上部署，请执行以下步骤："
echo "1. 复制 .env.example 为 .env"
echo "2. 在 .env 中填入你的私钥 (需要有测试币)"
echo "3. 运行: npx hardhat run scripts/deploy.js --network optimismSepolia"
