const hre = require("hardhat");

async function main() {
  const [owner, staker] = await hre.ethers.getSigners();
  console.log("启动 DeFi 质押演示...");

  // 1. 部署代币 (质押币 & 奖励币)
  // 简单起见，我们用同一个币
  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy("Staking Token", "STK");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("代币部署成功:", tokenAddress);

  // 2. 部署质押合约
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(tokenAddress, tokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("质押合约部署成功:", stakingAddress);

  // 3. 给质押合约转入一些奖励代币
  await token.transfer(stakingAddress, hre.ethers.parseEther("1000"));
  console.log("已注入 1000 奖励代币");

  // 4. 用户质押
  const stakeAmount = hre.ethers.parseEther("100");
  await token.approve(stakingAddress, stakeAmount);
  await staking.stake(stakeAmount);
  console.log("Owner 质押了 100 代币");

  // 5. 模拟时间流逝 (10秒)
  console.log("等待 10 秒产生奖励...");
  await hre.network.provider.send("evm_increaseTime", [10]);
  await hre.network.provider.send("evm_mine");

  // 6. 查看奖励
  const earned = await staking.earned(owner.address);
  console.log(`当前已赚取奖励: ${hre.ethers.formatEther(earned)}`);

  // 7. 领取奖励
  const balBefore = await token.balanceOf(owner.address);
  await staking.getReward();
  const balAfter = await token.balanceOf(owner.address);
  
  console.log(`领取奖励成功: ${hre.ethers.formatEther(balAfter - balBefore)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
