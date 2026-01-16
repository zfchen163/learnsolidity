#!/bin/bash
echo "安装依赖..."
npm install

echo "编译合约..."
npx hardhat compile

echo "运行演示脚本..."
npx hardhat run scripts/deploy.js
