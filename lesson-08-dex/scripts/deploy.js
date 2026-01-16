const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("启动 DEX 演示...");

  // 1. 部署两个代币 TokenA, TokenB
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const tokenA = await MockToken.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  const tokenB = await MockToken.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();
  
  const addrA = await tokenA.getAddress();
  const addrB = await tokenB.getAddress();
  console.log(`Token A: ${addrA}`);
  console.log(`Token B: ${addrB}`);

  // 2. 部署 DEX
  const SimpleDEX = await hre.ethers.getContractFactory("SimpleDEX");
  const dex = await SimpleDEX.deploy(addrA, addrB);
  await dex.waitForDeployment();
  const dexAddr = await dex.getAddress();
  console.log(`DEX 部署成功: ${dexAddr}`);

  // 3. 添加流动性 (1000 A + 1000 B)
  console.log("\n正在添加流动性...");
  const amountA = hre.ethers.parseEther("1000");
  const amountB = hre.ethers.parseEther("1000");

  // 授权 DEX 花费代币
  await tokenA.approve(dexAddr, amountA);
  await tokenB.approve(dexAddr, amountB);

  await dex.addLiquidity(amountA, amountB);
  console.log("流动性添加完成 (1000 A + 1000 B)");

  // 4. 交易 (Swap)
  // 用 100 A 换取 B
  console.log("\n正在用 100 TokenA 兑换 TokenB...");
  const inputA = hre.ethers.parseEther("100");
  await tokenA.approve(dexAddr, inputA);

  const balanceBBefore = await tokenB.balanceOf(owner.address);
  
  await dex.swapAforB(inputA);
  
  const balanceBAfter = await tokenB.balanceOf(owner.address);
  const receivedB = balanceBAfter - balanceBBefore;

  console.log(`交易成功！收到 TokenB: ${hre.ethers.formatEther(receivedB)}`);
  
  // 检查价格变动
  const price = await dex.getPrice();
  console.log(`当前价格 (A/B): ${hre.ethers.formatEther(price)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
