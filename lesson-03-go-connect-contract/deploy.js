// 部署脚本：部署存钱罐合约并生成 Go 绑定

const hre = require("hardhat");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

async function main() {
    console.log("=== 📦 部署和生成 Go 绑定 ===\n");

    // 1. 部署合约
    console.log("1️⃣  部署存钱罐合约...");
    const PiggyBank = await hre.ethers.getContractFactory("PiggyBank");
    const piggyBank = await PiggyBank.deploy();
    await piggyBank.waitForDeployment();
    
    const contractAddress = await piggyBank.getAddress();
    console.log("   ✅ 合约已部署");
    console.log("   合约地址:", contractAddress);
    console.log();

    // 2. 保存合约地址到文件
    fs.writeFileSync("contract_address.txt", contractAddress);
    console.log("2️⃣  合约地址已保存到 contract_address.txt");
    console.log();

    // 3. 生成 ABI 文件
    console.log("3️⃣  生成 ABI 文件...");
    const artifact = await hre.artifacts.readArtifact("PiggyBank");
    fs.writeFileSync("PiggyBank.abi", JSON.stringify(artifact.abi, null, 2));
    console.log("   ✅ ABI 已保存到 PiggyBank.abi");
    console.log();

    // 4. 生成 Bin 文件
    console.log("4️⃣  生成 Bin 文件...");
    fs.writeFileSync("PiggyBank.bin", artifact.bytecode.slice(2)); // 去掉 0x 前缀
    console.log("   ✅ Bytecode 已保存到 PiggyBank.bin");
    console.log();

    // 5. 使用 abigen 生成 Go 绑定
    console.log("5️⃣  生成 Go 绑定代码...");
    try {
        // 检查 abigen 是否安装
        try {
            await execPromise("which abigen");
        } catch (e) {
            console.log("   ⚠️  未找到 abigen，正在安装...");
            console.log("   这可能需要几分钟...");
            await execPromise("go install github.com/ethereum/go-ethereum/cmd/abigen@latest");
            console.log("   ✅ abigen 安装完成");
        }

        // 创建 contracts 目录
        if (!fs.existsSync("contracts")) {
            fs.mkdirSync("contracts");
        }

        // 生成 Go 绑定
        const cmd = "abigen --abi=PiggyBank.abi --bin=PiggyBank.bin --pkg=contracts --type=PiggyBank --out=contracts/PiggyBank.go";
        await execPromise(cmd);
        console.log("   ✅ Go 绑定已生成到 contracts/PiggyBank.go");
    } catch (error) {
        console.error("   ❌ 生成 Go 绑定失败:", error.message);
        console.log("\n   请手动运行:");
        console.log("   abigen --abi=PiggyBank.abi --bin=PiggyBank.bin --pkg=contracts --type=PiggyBank --out=contracts/PiggyBank.go");
    }
    console.log();

    console.log("=== ✅ 部署完成 ===");
    console.log("\n现在可以运行 Go 程序:");
    console.log("go run main.go");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
