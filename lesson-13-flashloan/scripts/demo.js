const hre = require("hardhat");

async function main() {
  console.log("启动闪电贷演示 (Mock Aave Pool)...");

  const [owner] = await hre.ethers.getSigners();

  // 1. 部署模拟代币 (USDC)
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Mock Token 部署成功:", tokenAddress);

  // 2. 部署模拟资金池
  const MockPool = await hre.ethers.getContractFactory("MockPool");
  const pool = await MockPool.deploy();
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("Mock Pool 部署成功:", poolAddress);

  // 3. 给资金池注入流动性 (转 10000 个代币进去)
  const liquidityAmount = hre.ethers.parseEther("10000");
  await token.transfer(poolAddress, liquidityAmount);
  console.log("已向资金池注入流动性: 10000 Tokens");

  // 4. 部署我们的闪电贷合约
  const MyFlashLoan = await hre.ethers.getContractFactory("MyFlashLoan");
  const flashLoan = await MyFlashLoan.deploy(poolAddress);
  await flashLoan.waitForDeployment();
  const flashLoanAddress = await flashLoan.getAddress();
  console.log("MyFlashLoan 合约部署成功:", flashLoanAddress);

  // 5. 给我们的合约转一点钱，用来付利息 (0.09%)
  // 借 1000，利息 0.9。我们转 1 个进去够用了。
  const feeAmount = hre.ethers.parseEther("1");
  await token.transfer(flashLoanAddress, feeAmount);
  console.log("已预存利息费用到合约");

  // 6. 发起闪电贷！借 1000 个
  console.log("正在发起闪电贷借款 1000 Tokens...");
  const borrowAmount = hre.ethers.parseEther("1000");
  
  // 记录借款前资金池余额
  const balBefore = await token.balanceOf(poolAddress);
  
  await flashLoan.requestFlashLoan(tokenAddress, borrowAmount);
  
  // 记录借款后资金池余额
  const balAfter = await token.balanceOf(poolAddress);

  console.log("闪电贷执行成功！");
  console.log("资金池余额变化:", hre.ethers.formatEther(balAfter - balBefore));
  console.log("可以看到余额增加了 (本金回来了 + 赚了利息)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
