require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// 从 .env 文件读取私钥 (如果存在)
// 如果没有 .env，这里会使用空数组，部署脚本会报错提示
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; 

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Optimism Sepolia 测试网
    optimismSepolia: {
      url: "https://sepolia.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Arbitrum Sepolia 测试网
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Base Sepolia
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  },
};
