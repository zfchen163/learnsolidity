const hre = require("hardhat");

async function main() {
  console.log(`正在部署 Greeter 合约到网络: ${hre.network.name}...`);

  const greeting = "Hello Layer 2!";
  const Greeter = await hre.ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy(greeting);

  await greeter.waitForDeployment();
  const address = await greeter.getAddress();

  console.log(`Greeter 部署成功!`);
  console.log(`地址: ${address}`);
  console.log(`初始问候语: ${greeting}`);

  // 提示：在 Layer 2 上，你可以在区块浏览器上查看这个地址
  if (hre.network.name === "optimismSepolia") {
    console.log(`查看: https://sepolia-optimism.etherscan.io/address/${address}`);
  } else if (hre.network.name === "arbitrumSepolia") {
    console.log(`查看: https://sepolia.arbiscan.io/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
