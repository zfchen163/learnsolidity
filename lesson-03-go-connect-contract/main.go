package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"lesson03/contracts"
)

// 配置
const (
	// 本地节点地址（Hardhat）
	nodeURL = "http://127.0.0.1:8545"
	
	// Hardhat 默认的第一个账户私钥（仅用于测试！）
	privateKeyHex = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
)

func main() {
	fmt.Println("=== 🔗 Go 连接智能合约测试 ===\n")

	// 1. 连接以太坊节点
	fmt.Println("1️⃣  连接以太坊节点")
	client, err := ethclient.Dial(nodeURL)
	if err != nil {
		log.Fatalf("❌ 连接失败: %v", err)
	}
	fmt.Printf("   ✅ 已连接到: %s\n", nodeURL)

	// 获取链ID
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		log.Fatalf("❌ 获取链ID失败: %v", err)
	}
	fmt.Printf("   区块链ID: %s\n", chainID.String())

	// 获取最新区块号
	blockNumber, err := client.BlockNumber(context.Background())
	if err != nil {
		log.Fatalf("❌ 获取区块号失败: %v", err)
	}
	fmt.Printf("   最新区块: %d\n", blockNumber)
	fmt.Println()

	// 2. 加载账户
	fmt.Println("2️⃣  加载账户")
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		log.Fatalf("❌ 加载私钥失败: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("❌ 无法转换公钥")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	fmt.Printf("   主人地址: %s\n", fromAddress.Hex())

	// 查询账户余额
	balance, err := client.BalanceAt(context.Background(), fromAddress, nil)
	if err != nil {
		log.Fatalf("❌ 查询余额失败: %v", err)
	}
	fmt.Printf("   主人余额: %s ETH\n", weiToEther(balance))
	fmt.Println()

	// 3. 读取合约地址（从文件）
	fmt.Println("3️⃣  加载合约")
	contractAddressBytes, err := os.ReadFile("contract_address.txt")
	if err != nil {
		log.Fatalf("❌ 读取合约地址失败: %v\n提示: 请先运行 ./run.sh 部署合约", err)
	}
	contractAddress := common.HexToAddress(string(contractAddressBytes))
	fmt.Printf("   合约地址: %s\n", contractAddress.Hex())

	// 加载合约实例
	piggyBank, err := contracts.NewPiggyBank(contractAddress, client)
	if err != nil {
		log.Fatalf("❌ 加载合约失败: %v", err)
	}
	fmt.Println("   ✅ 合约加载成功")
	fmt.Println()

	// 4. 查询合约信息（只读操作，不需要 Gas）
	fmt.Println("4️⃣  查询合约信息")
	
	// 查询合约主人
	owner, err := piggyBank.Owner(&bind.CallOpts{})
	if err != nil {
		log.Fatalf("❌ 查询主人失败: %v", err)
	}
	fmt.Printf("   合约主人: %s\n", owner.Hex())

	// 查询当前余额
	contractBalance, err := piggyBank.GetBalance(&bind.CallOpts{})
	if err != nil {
		log.Fatalf("❌ 查询余额失败: %v", err)
	}
	fmt.Printf("   当前余额: %s ETH\n", weiToEther(contractBalance))

	// 查询存款次数
	depositCount, err := piggyBank.GetDepositCount(&bind.CallOpts{})
	if err != nil {
		log.Fatalf("❌ 查询存款次数失败: %v", err)
	}
	fmt.Printf("   存款次数: %d\n", depositCount.Uint64())
	fmt.Println()

	// 5. 存入 1 ETH（写操作，需要 Gas）
	fmt.Println("5️⃣  存入 1 ETH")
	
	// 创建交易选项
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		log.Fatalf("❌ 创建交易选项失败: %v", err)
	}
	
	// 设置要发送的金额
	depositAmount := etherToWei(1.0)
	auth.Value = depositAmount
	auth.GasLimit = uint64(100000) // 设置 Gas 限制

	// 调用 deposit 函数
	tx, err := piggyBank.Deposit(auth)
	if err != nil {
		log.Fatalf("❌ 存款失败: %v", err)
	}
	fmt.Printf("   ✅ 交易已发送\n")
	fmt.Printf("   交易哈希: %s\n", tx.Hash().Hex())
	fmt.Print("   ⏳ 等待确认...")

	// 等待交易被打包
	receipt, err := bind.WaitMined(context.Background(), client, tx)
	if err != nil {
		log.Fatalf("❌ 等待交易确认失败: %v", err)
	}
	fmt.Println(" 完成！")
	fmt.Printf("   ✅ 交易已确认！\n")
	fmt.Printf("   Gas 使用: %d\n", receipt.GasUsed)

	// 再次查询余额
	contractBalance, _ = piggyBank.GetBalance(&bind.CallOpts{})
	fmt.Printf("   新余额: %s ETH\n", weiToEther(contractBalance))
	fmt.Println()

	// 6. 再存入 0.5 ETH
	fmt.Println("6️⃣  再存入 0.5 ETH")
	
	// 重置交易选项（必须重新创建）
	auth, _ = bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	auth.Value = etherToWei(0.5)
	auth.GasLimit = uint64(100000)

	tx, err = piggyBank.Deposit(auth)
	if err != nil {
		log.Fatalf("❌ 存款失败: %v", err)
	}
	fmt.Printf("   ✅ 交易已发送: %s\n", tx.Hash().Hex())
	
	bind.WaitMined(context.Background(), client, tx)
	fmt.Println("   ✅ 交易已确认！")

	contractBalance, _ = piggyBank.GetBalance(&bind.CallOpts{})
	depositCount, _ = piggyBank.GetDepositCount(&bind.CallOpts{})
	fmt.Printf("   新余额: %s ETH\n", weiToEther(contractBalance))
	fmt.Printf("   存款次数: %d\n", depositCount.Uint64())
	fmt.Println()

	// 7. 查询历史事件
	fmt.Println("7️⃣  查询历史事件")
	
	// 创建过滤器（查询从区块0到最新的所有事件）
	filterOpts := &bind.FilterOpts{
		Start:   0,
		End:     nil,
		Context: context.Background(),
	}

	// 获取所有 Deposited 事件
	iter, err := piggyBank.FilterDeposited(filterOpts, nil)
	if err != nil {
		log.Fatalf("❌ 查询事件失败: %v", err)
	}

	eventCount := 0
	for iter.Next() {
		event := iter.Event
		eventCount++
		fmt.Printf("   📢 事件 #%d:\n", eventCount)
		fmt.Printf("      存款人: %s\n", event.Depositor.Hex())
		fmt.Printf("      金额: %s ETH\n", weiToEther(event.Amount))
		fmt.Printf("      新余额: %s ETH\n", weiToEther(event.NewBalance))
		fmt.Printf("      区块: %d\n", event.Raw.BlockNumber)
		fmt.Println()
	}

	if err := iter.Error(); err != nil {
		log.Fatalf("❌ 遍历事件失败: %v", err)
	}
	fmt.Println()

	// 8. 取出所有钱
	fmt.Println("8️⃣  取出所有钱")
	
	// 重置交易选项（取钱不需要发送 ETH）
	auth, _ = bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	auth.Value = big.NewInt(0) // 不发送 ETH
	auth.GasLimit = uint64(100000)

	// 记录取钱前的余额
	balanceBefore := contractBalance

	tx, err = piggyBank.Withdraw(auth)
	if err != nil {
		log.Fatalf("❌ 取款失败: %v", err)
	}
	fmt.Printf("   ✅ 交易已发送: %s\n", tx.Hash().Hex())
	
	bind.WaitMined(context.Background(), client, tx)
	fmt.Println("   ✅ 取款成功！")
	fmt.Printf("   取出金额: %s ETH\n", weiToEther(balanceBefore))

	// 查询新余额
	contractBalance, _ = piggyBank.GetBalance(&bind.CallOpts{})
	fmt.Printf("   新余额: %s ETH\n", weiToEther(contractBalance))
	fmt.Println()

	// 9. 总结
	fmt.Println("=== ✅ 测试完成 ===\n")
	fmt.Println("💡 你学会了：")
	fmt.Println("1. 用 Go 连接以太坊节点")
	fmt.Println("2. 加载智能合约实例")
	fmt.Println("3. 调用只读函数（CallOpts）")
	fmt.Println("4. 发送交易（TransactOpts）")
	fmt.Println("5. 等待交易确认")
	fmt.Println("6. 查询历史事件")
	fmt.Println()
	fmt.Println("🎯 下一课：转账和余额查询")
}

// 工具函数：Wei 转 ETH
func weiToEther(wei *big.Int) string {
	// 1 ETH = 10^18 Wei
	fbalance := new(big.Float)
	fbalance.SetString(wei.String())
	ethValue := new(big.Float).Quo(fbalance, big.NewFloat(1e18))
	return ethValue.Text('f', 6) // 保留6位小数
}

// 工具函数：ETH 转 Wei
func etherToWei(eth float64) *big.Int {
	// 1 ETH = 10^18 Wei
	ethBig := big.NewFloat(eth)
	weiBig := new(big.Float).Mul(ethBig, big.NewFloat(1e18))
	wei := new(big.Int)
	weiBig.Int(wei)
	return wei
}
