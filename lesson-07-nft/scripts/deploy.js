const hre = require("hardhat");

async function main() {
  // 1. 部署
  const SimpleNFT = await hre.ethers.getContractFactory("SimpleNFT");
  const nft = await SimpleNFT.deploy();
  await nft.waitForDeployment();
  const address = await nft.getAddress();
  console.log("SimpleNFT 部署成功:", address);

  const [owner] = await hre.ethers.getSigners();

  // 2. 铸造 NFT
  console.log("正在铸造 NFT #0...");
  const tokenURI = "https://example.com/nft/0.json";
  await nft.mint(owner.address, tokenURI);
  console.log("铸造成功！");

  // 3. 检查所有权
  const ownerOfToken0 = await nft.ownerOf(0);
  console.log(`NFT #0 的主人是: ${ownerOfToken0}`);
  
  if (ownerOfToken0 === owner.address) {
    console.log("✅ 验证通过");
  } else {
    console.log("❌ 验证失败");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
