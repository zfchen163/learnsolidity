const hre = require("hardhat");

async function main() {
  const initialSupply = 1000000; // 100万个
  const SimpleToken = await hre.ethers.getContractFactory("SimpleToken");
  const token = await SimpleToken.deploy(initialSupply);
  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log(`SimpleToken 部署成功: ${address}`);
  console.log(`初始供应量: ${initialSupply}`);

  // 获取代币信息
  const name = await token.name();
  const symbol = await token.symbol();
  console.log(`代币信息: ${name} (${symbol})`);

  // 转账测试
  const [owner, receiver] = await hre.ethers.getSigners();
  console.log(`\n正在从 ${owner.address} 转账 100 个代币给 ${receiver.address}...`);
  
  const transferAmount = hre.ethers.parseEther("100"); // 假设 18 位小数
  // 注意：我们的 SimpleToken 构造函数里处理了精度，但这里为了演示简便，
  // 如果 SimpleToken 的 transfer 接收的是 raw unit，我们需要确认一下。
  // 查看代码: totalSupply = _initialSupply * 10 ** uint256(decimals);
  // 所以 _initialSupply 是“个”，内部成了 wei。
  // transfer 函数接收的是 wei。
  
  await token.transfer(receiver.address, transferAmount);
  
  const balance = await token.balanceOf(receiver.address);
  console.log(`接收者余额: ${hre.ethers.formatEther(balance)} ${symbol}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
