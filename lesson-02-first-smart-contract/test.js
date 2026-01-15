// 测试脚本：部署和测试存钱罐合约
// 使用 Hardhat 框架

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("=== 🏦 存钱罐智能合约测试 ===\n");

    // 1. 获取账户
    const [owner, user1, user2] = await ethers.getSigners();
    console.log("📋 账户信息:");
    console.log("   主人地址:", owner.address);
    console.log("   用户1地址:", user1.address);
    console.log("   用户2地址:", user2.address);
    console.log();

    // 2. 部署合约
    console.log("🚀 部署存钱罐合约...");
    const PiggyBank = await ethers.getContractFactory("PiggyBank");
    const piggyBank = await PiggyBank.deploy();
    await piggyBank.waitForDeployment();
    
    const contractAddress = await piggyBank.getAddress();
    console.log("✅ 合约部署成功！");
    console.log("   合约地址:", contractAddress);
    console.log();

    // 3. 测试初始状态
    console.log("=== 测试1: 初始状态 ===");
    let balance = await piggyBank.getBalance();
    let depositCount = await piggyBank.getDepositCount();
    let contractOwner = await piggyBank.owner();
    
    console.log("   存钱罐余额:", ethers.formatEther(balance), "ETH");
    console.log("   存款次数:", depositCount.toString());
    console.log("   合约主人:", contractOwner);
    console.log("   主人验证:", await piggyBank.isOwner(owner.address) ? "✅" : "❌");
    console.log();

    // 4. 测试存钱（主人存钱）
    console.log("=== 测试2: 主人存入 1 ETH ===");
    let tx = await piggyBank.deposit({ value: ethers.parseEther("1.0") });
    await tx.wait();
    console.log("   ✅ 交易成功！");
    console.log("   交易哈希:", tx.hash);
    
    balance = await piggyBank.getBalance();
    depositCount = await piggyBank.getDepositCount();
    console.log("   存钱罐余额:", ethers.formatEther(balance), "ETH");
    console.log("   存款次数:", depositCount.toString());
    console.log();

    // 5. 测试存钱（其他用户存钱）
    console.log("=== 测试3: 用户1存入 0.5 ETH ===");
    tx = await piggyBank.connect(user1).deposit({ value: ethers.parseEther("0.5") });
    await tx.wait();
    console.log("   ✅ 交易成功！");
    
    balance = await piggyBank.getBalance();
    depositCount = await piggyBank.getDepositCount();
    console.log("   存钱罐余额:", ethers.formatEther(balance), "ETH");
    console.log("   存款次数:", depositCount.toString());
    console.log();

    // 6. 测试存钱（用户2直接转账）
    console.log("=== 测试4: 用户2直接转账 0.3 ETH ===");
    tx = await user2.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("0.3")
    });
    await tx.wait();
    console.log("   ✅ 交易成功！");
    
    balance = await piggyBank.getBalance();
    depositCount = await piggyBank.getDepositCount();
    console.log("   存钱罐余额:", ethers.formatEther(balance), "ETH");
    console.log("   存款次数:", depositCount.toString());
    console.log();

    // 7. 测试非主人取钱（应该失败）
    console.log("=== 测试5: 用户1尝试取钱（应该失败）===");
    try {
        tx = await piggyBank.connect(user1).withdraw();
        await tx.wait();
        console.log("   ❌ 不应该成功！");
    } catch (error) {
        console.log("   ✅ 正确阻止了非主人取钱");
        console.log("   错误信息:", error.message.split('\n')[0]);
    }
    console.log();

    // 8. 测试主人取钱
    console.log("=== 测试6: 主人取出所有钱 ===");
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    console.log("   主人取钱前余额:", ethers.formatEther(ownerBalanceBefore), "ETH");
    
    tx = await piggyBank.withdraw();
    const receipt = await tx.wait();
    console.log("   ✅ 取钱成功！");
    
    // 计算实际收到的钱（要扣除 Gas 费）
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const actualReceived = ownerBalanceAfter - ownerBalanceBefore + gasUsed;
    
    console.log("   主人取钱后余额:", ethers.formatEther(ownerBalanceAfter), "ETH");
    console.log("   实际收到:", ethers.formatEther(actualReceived), "ETH");
    console.log("   Gas 费用:", ethers.formatEther(gasUsed), "ETH");
    
    balance = await piggyBank.getBalance();
    console.log("   存钱罐余额:", ethers.formatEther(balance), "ETH");
    console.log();

    // 9. 测试空存钱罐取钱（应该失败）
    console.log("=== 测试7: 从空存钱罐取钱（应该失败）===");
    try {
        tx = await piggyBank.withdraw();
        await tx.wait();
        console.log("   ❌ 不应该成功！");
    } catch (error) {
        console.log("   ✅ 正确阻止了从空存钱罐取钱");
        console.log("   错误信息:", error.message.split('\n')[0]);
    }
    console.log();

    // 10. 测试存0元（应该失败）
    console.log("=== 测试8: 存入 0 ETH（应该失败）===");
    try {
        tx = await piggyBank.deposit({ value: 0 });
        await tx.wait();
        console.log("   ❌ 不应该成功！");
    } catch (error) {
        console.log("   ✅ 正确阻止了0金额存款");
        console.log("   错误信息:", error.message.split('\n')[0]);
    }
    console.log();

    // 11. 监听事件
    console.log("=== 测试9: 监听事件 ===");
    console.log("   再存一笔钱，观察事件...");
    
    // 设置事件监听器
    piggyBank.on("Deposited", (depositor, amount, newBalance) => {
        console.log("   📢 收到存款事件:");
        console.log("      存款人:", depositor);
        console.log("      金额:", ethers.formatEther(amount), "ETH");
        console.log("      新余额:", ethers.formatEther(newBalance), "ETH");
    });
    
    tx = await piggyBank.deposit({ value: ethers.parseEther("2.0") });
    await tx.wait();
    
    // 等待事件触发
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log();

    // 12. 总结
    console.log("=== 📊 测试总结 ===");
    balance = await piggyBank.getBalance();
    depositCount = await piggyBank.getDepositCount();
    console.log("   最终余额:", ethers.formatEther(balance), "ETH");
    console.log("   总存款次数:", depositCount.toString());
    console.log();
    console.log("✅ 所有测试完成！");
    console.log();
    console.log("=== 💡 学到了什么？ ===");
    console.log("1. 智能合约可以存储和转移以太币");
    console.log("2. 可以设置权限控制（只有主人能取钱）");
    console.log("3. require 可以检查条件，不满足就回滚");
    console.log("4. 事件可以记录合约的活动");
    console.log("5. 任何人都可以存钱，但只有主人能取钱");
}

// 运行测试
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
