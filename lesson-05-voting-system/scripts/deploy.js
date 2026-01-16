const hre = require("hardhat");

async function main() {
  // 1. 部署
  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();
  const address = await voting.getAddress();
  console.log("投票合约部署成功，地址:", address);

  // 2. 添加候选人
  console.log("正在添加候选人...");
  await voting.addCandidate("Alice");
  await voting.addCandidate("Bob");
  console.log("候选人 Alice 和 Bob 已添加");

  // 3. 投票
  console.log("正在给 Alice (ID: 0) 投票...");
  const tx = await voting.vote(0);
  await tx.wait();
  console.log("投票成功！");

  // 4. 查看结果
  const [winnerId, winnerName, votes] = await voting.getWinner();
  console.log(`当前获胜者: ${winnerName} (得票: ${votes})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
