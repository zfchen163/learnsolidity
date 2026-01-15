const hre = require("hardhat");

async function main() {
  console.log("启动 DAO 治理演示...");
  const [owner, voter1, voter2] = await hre.ethers.getSigners();

  // 1. 部署治理代币
  console.log("1. 部署治理代币...");
  const MyVoteToken = await hre.ethers.getContractFactory("MyVoteToken");
  const token = await MyVoteToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  
  // 必须委托投票权给自己才能激活
  await token.delegate(owner.address);
  console.log("   代币地址:", tokenAddress);
  console.log("   已将投票权委托给 Owner");

  // 2. 部署时间锁 (Timelock)
  console.log("2. 部署时间锁...");
  // 最小延迟 0 秒 (为了演示方便)
  // Proposers: 稍后设为 Governor
  // Executors: 0x0 (任何人)
  const minDelay = 0;
  const MyTimelock = await hre.ethers.getContractFactory("MyTimelock");
  const timelock = await MyTimelock.deploy(minDelay, [], ["0x0000000000000000000000000000000000000000"]);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("   Timelock 地址:", timelockAddress);

  // 3. 部署 Governor (核心治理合约)
  console.log("3. 部署 Governor...");
  const MyGovernor = await hre.ethers.getContractFactory("MyGovernor");
  const governor = await MyGovernor.deploy(tokenAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("   Governor 地址:", governorAddress);

  // 4. 设置 Timelock 权限
  // 需要把 Proposer 角色给 Governor 合约
  // TimelockController 的角色哈希
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  // 此时 admin 还是 deployer，所以可以设置
  await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  console.log("   已授权 Governor 为 Timelock 的 Proposer");

  // 5. 部署目标合约 (Box)
  // Box 的 Owner 必须是 Timelock 合约，这样只有 DAO 才能修改它
  console.log("4. 部署目标合约 Box...");
  const Box = await hre.ethers.getContractFactory("Box");
  // 初始 owner 设为 timelock
  const box = await Box.deploy(timelockAddress);
  await box.waitForDeployment();
  const boxAddress = await box.getAddress();
  console.log("   Box 地址:", boxAddress);
  console.log("   Box 的 Owner 是 Timelock (所以我们不能直接修改它)");

  // --- 治理流程开始 ---

  // 6. 发起提案：把 Box 的值改为 777
  console.log("\n--- 发起提案 ---");
  const proposeTx = await governor.propose(
    [boxAddress], // 目标合约
    [0],          // 附带 ETH
    [box.interface.encodeFunctionData("store", [777])], // 调用 store(777)
    "Proposal #1: Store 777 in the Box" // 描述
  );
  const proposeReceipt = await proposeTx.wait();
  
  // 获取 Proposal ID
  const proposalId = proposeReceipt.logs[0].args.proposalId;
  console.log(`提案 ID: ${proposalId}`);

  // 7. 投票
  console.log("\n--- 投票 ---");
  // 1 = For, 0 = Against, 2 = Abstain
  // 因为没有设置 Voting Delay，所以可以立刻投票 (但实际可能需要等 1 区块)
  // 为了保险，挖一个块
  await hre.network.provider.send("evm_mine");

  const voteTx = await governor.castVote(proposalId, 1);
  await voteTx.wait();
  console.log("Owner 已投赞成票");

  // 8. 等待投票期结束
  console.log("\n--- 等待投票期结束 (模拟区块挖掘) ---");
  // 需要挖过 Voting Period (100 blocks)
  // 使用 Hardhat 网络辅助函数快速挖矿
  await hre.network.provider.send("hardhat_mine", ["0x64"]); // 0x64 = 100 blocks
  console.log("已跳过 100 个区块");

  // 9. 排队 (Queue)
  console.log("\n--- 提案排队 ---");
  const descriptionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Proposal #1: Store 777 in the Box"));
  const queueTx = await governor.queue(
    [boxAddress],
    [0],
    [box.interface.encodeFunctionData("store", [777])],
    descriptionHash
  );
  await queueTx.wait();
  console.log("提案已排队");

  // 10. 执行 (Execute)
  console.log("\n--- 执行提案 ---");
  // 因为 Timelock 延迟是 0，可以立刻执行
  const executeTx = await governor.execute(
    [boxAddress],
    [0],
    [box.interface.encodeFunctionData("store", [777])],
    descriptionHash
  );
  await executeTx.wait();
  console.log("提案已执行！");

  // 11. 验证结果
  const newValue = await box.retrieve();
  console.log(`\n最终 Box 的值: ${newValue}`);
  
  if (newValue.toString() === "777") {
    console.log("✅ 成功！DAO 成功修改了 Box 的值。");
  } else {
    console.log("❌ 失败。");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
