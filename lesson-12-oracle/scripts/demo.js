const hre = require("hardhat");

async function main() {
  console.log("启动本地 Oracle 演示...");

  // 1. 部署 Mock 预言机 (模拟 ETH/USD 价格)
  // 8 位小数，初始价格 2000 USD
  const DECIMALS = 8;
  const INITIAL_PRICE = 200000000000; 

  const MockV3Aggregator = await hre.ethers.getContractFactory("MockV3Aggregator");
  const mockOracle = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);
  await mockOracle.waitForDeployment();
  const mockAddress = await mockOracle.getAddress();
  
  console.log("Mock Oracle 部署成功，地址:", mockAddress);
  console.log("当前 Mock 价格: $2000");

  // 2. 部署消费者合约
  const PriceConsumerV3 = await hre.ethers.getContractFactory("PriceConsumerV3");
  const priceConsumer = await PriceConsumerV3.deploy(mockAddress);
  await priceConsumer.waitForDeployment();
  console.log("PriceConsumer 部署成功");

  // 3. 读取价格
  let price = await priceConsumer.getLatestPrice();
  console.log("合约读取到的价格:", price.toString());

  // 4. 更新价格 (模拟市场波动)
  console.log("\n模拟市场波动: ETH 涨到了 $2500...");
  const NEW_PRICE = 250000000000;
  await mockOracle.updateAnswer(NEW_PRICE);

  // 5. 再次读取
  price = await priceConsumer.getLatestPrice();
  console.log("合约读取到的新价格:", price.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
