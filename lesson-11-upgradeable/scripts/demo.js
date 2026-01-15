const { ethers, upgrades } = require("hardhat");

async function main() {
  // 1. 部署 V1
  console.log("正在部署 MyTokenV1...");
  const MyTokenV1 = await ethers.getContractFactory("MyTokenV1");
  const token = await upgrades.deployProxy(MyTokenV1, [], { initializer: 'initialize' });
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MyTokenV1 部署成功，地址:", tokenAddress);

  // 验证 V1 功能
  const name = await token.name();
  console.log("当前代币名称:", name);
  
  // 尝试调用 mint (V1 应该没有这个功能)
  // 注意：在 JS 中调用不存在的函数会报错，这里只是演示逻辑
  console.log("V1 版本没有 mint 函数...");

  // 2. 升级到 V2
  console.log("\n正在升级到 MyTokenV2...");
  const MyTokenV2 = await ethers.getContractFactory("MyTokenV2");
  const upgraded = await upgrades.upgradeProxy(tokenAddress, MyTokenV2);
  console.log("升级成功！");

  // 验证 V2 功能
  console.log("正在测试 V2 的 mint 功能...");
  const [owner] = await ethers.getSigners();
  const tx = await upgraded.mint(owner.address, ethers.parseEther("100"));
  await tx.wait();
  
  const balance = await upgraded.balanceOf(owner.address);
  console.log("当前余额:", ethers.formatEther(balance));
  console.log("测试完成！");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
