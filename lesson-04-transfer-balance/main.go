package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

const (
	nodeURL = "http://127.0.0.1:8545"
	
	// Hardhat 默认账户（仅测试用！）
	privateKeyA = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
	privateKeyB = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
)

func main() {
	fmt.Println("=== 💸 转账和余额查询 ===\n")

	// 1. 连接节点
	fmt.Println("1️⃣  连接以太坊节点")
	client, err := ethclient.Dial(nodeURL)
	if err != nil {
		log.Fatalf("❌ 连接失败: %v", err)
	}
	fmt.Printf("   ✅ 已连接到: %s\n", nodeURL)

	chainID, _ := client.ChainID(context.Background())
	fmt.Printf("   链ID: %s\n", chainID.String())
	fmt.Println()

	// 2. 加载账户
	fmt.Println("2️⃣  账户信息")
	
	// 账户A
	privateKeyECDSA_A, _ := crypto.HexToECDSA(privateKeyA)
	publicKeyECDSA_A := privateKeyECDSA_A.Public().(*ecdsa.PublicKey)
	addressA := crypto.PubkeyToAddress(*publicKeyECDSA_A)
	
	// 账户B
	privateKeyECDSA_B, _ := crypto.HexToECDSA(privateKeyB)
	publicKeyECDSA_B := privateKeyECDSA_B.Public().(*ecdsa.PublicKey)
	addressB := crypto.PubkeyToAddress(*publicKeyECDSA_B)

	fmt.Printf("   账户A: %s\n", addressA.Hex())
	fmt.Printf("   账户B: %s\n", addressB.Hex())
	fmt.Println()

	// 3. 查询初始余额
	fmt.Println("   初始余额:")
	balanceA_before, _ := client.BalanceAt(context.Background(), addressA, nil)
	balanceB_before, _ := client.BalanceAt(context.Background(), addressB, nil)
	
	fmt.Printf("   账户A: %s ETH\n", weiToEther(balanceA_before))
	fmt.Printf("   账户B: %s ETH\n", weiToEther(balanceB_before))
	fmt.Println()

	// 4. 转账 1 ETH 从 A 到 B
	fmt.Println("3️⃣  转账 1 ETH 从 A 到 B")
	
	// 获取 nonce（交易序号）
	nonce, err := client.PendingNonceAt(context.Background(), addressA)
	if err != nil {
		log.Fatalf("❌ 获取 nonce 失败: %v", err)
	}

	// 转账金额
	transferAmount := etherToWei(1.0)

	// 获取建议的 Gas 价格
	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatalf("❌ 获取 Gas 价格失败: %v", err)
	}

	// Gas 限制（简单转账固定 21000）
	gasLimit := uint64(21000)

	// 创建交易
	tx := types.NewTransaction(
		nonce,
		addressB,
		transferAmount,
		gasLimit,
		gasPrice,
		nil, // data（简单转账为空）
	)

	// 签名交易
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKeyECDSA_A)
	if err != nil {
		log.Fatalf("❌ 签名失败: %v", err)
	}

	// 发送交易
	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		log.Fatalf("❌ 发送交易失败: %v", err)
	}

	fmt.Println("   ✅ 交易已发送")
	fmt.Printf("   交易哈希: %s\n", signedTx.Hash().Hex())
	fmt.Print("   ⏳ 等待确认...")

	// 等待交易被打包
	receipt, err := waitForReceipt(client, signedTx.Hash())
	if err != nil {
		log.Fatalf("❌ 等待确认失败: %v", err)
	}
	fmt.Println(" 完成！")
	fmt.Println()

	// 5. 显示 Gas 信息
	fmt.Println("   Gas 信息:")
	fmt.Printf("   Gas 价格: %s Gwei\n", weiToGwei(gasPrice))
	fmt.Printf("   Gas 使用: %d\n", receipt.GasUsed)
	
	gasCost := new(big.Int).Mul(gasPrice, big.NewInt(int64(receipt.GasUsed)))
	fmt.Printf("   Gas 费用: %s ETH\n", weiToEther(gasCost))
	fmt.Println()

	// 6. 显示转账详情
	fmt.Println("   转账详情:")
	fmt.Printf("   发送金额: %s ETH\n", weiToEther(transferAmount))
	
	totalCost := new(big.Int).Add(transferAmount, gasCost)
	fmt.Printf("   实际扣除: %s ETH (含 Gas)\n", weiToEther(totalCost))
	fmt.Println()

	// 7. 查询转账后余额
	fmt.Println("4️⃣  转账后余额")
	balanceA_after, _ := client.BalanceAt(context.Background(), addressA, nil)
	balanceB_after, _ := client.BalanceAt(context.Background(), addressB, nil)

	fmt.Printf("   账户A: %s ETH", weiToEther(balanceA_after))
	
	// 计算变化
	changeA := new(big.Int).Sub(balanceA_before, balanceA_after)
	fmt.Printf(" (减少 %s ETH)\n", weiToEther(changeA))

	fmt.Printf("   账户B: %s ETH", weiToEther(balanceB_after))
	changeB := new(big.Int).Sub(balanceB_after, balanceB_before)
	fmt.Printf(" (增加 %s ETH)\n", weiToEther(changeB))
	fmt.Println()

	// 8. 验证余额变化
	if changeB.Cmp(transferAmount) == 0 {
		fmt.Println("   ✅ 余额变化正确！")
	} else {
		fmt.Println("   ❌ 余额变化异常！")
	}
	fmt.Println()

	// 9. 批量查询余额
	fmt.Println("5️⃣  批量查询余额")
	
	addresses := []common.Address{
		addressA,
		addressB,
		common.HexToAddress("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"), // Hardhat 账户3
	}

	total := big.NewInt(0)
	for i, addr := range addresses {
		balance, _ := client.BalanceAt(context.Background(), addr, nil)
		fmt.Printf("   地址%d: %s ETH\n", i+1, weiToEther(balance))
		total.Add(total, balance)
	}
	fmt.Printf("   总计: %s ETH\n", weiToEther(total))
	fmt.Println()

	// 10. 单位转换示例
	fmt.Println("6️⃣  单位转换示例")
	amount := big.NewInt(1500000000000000000) // 1.5 ETH in Wei
	
	fmt.Printf("   Wei:   %s\n", amount.String())
	fmt.Printf("   Gwei:  %s\n", weiToGwei(amount))
	fmt.Printf("   ETH:   %s\n", weiToEther(amount))
	fmt.Println()

	// 11. 查询交易详情
	fmt.Println("7️⃣  查询交易详情")
	txDetail, _, err := client.TransactionByHash(context.Background(), signedTx.Hash())
	if err != nil {
		log.Fatalf("❌ 查询交易失败: %v", err)
	}

	fmt.Printf("   交易哈希: %s\n", txDetail.Hash().Hex())
	fmt.Printf("   发送方: %s\n", addressA.Hex())
	fmt.Printf("   接收方: %s\n", txDetail.To().Hex())
	fmt.Printf("   金额: %s ETH\n", weiToEther(txDetail.Value()))
	fmt.Printf("   Nonce: %d\n", txDetail.Nonce())
	fmt.Printf("   Gas 价格: %s Gwei\n", weiToGwei(txDetail.GasPrice()))
	fmt.Printf("   Gas 限制: %d\n", txDetail.Gas())
	fmt.Println()

	// 12. 总结
	fmt.Println("=== ✅ 测试完成 ===\n")
	fmt.Println("💡 你学会了：")
	fmt.Println("1. 查询地址余额")
	fmt.Println("2. 创建和签名交易")
	fmt.Println("3. 发送转账交易")
	fmt.Println("4. 等待交易确认")
	fmt.Println("5. 计算 Gas 费用")
	fmt.Println("6. Wei/Gwei/ETH 单位转换")
	fmt.Println("7. 查询交易详情")
	fmt.Println()
	fmt.Println("🎯 下一课：投票系统（理解状态）")
}

// 等待交易收据
func waitForReceipt(client *ethclient.Client, txHash common.Hash) (*types.Receipt, error) {
	for {
		receipt, err := client.TransactionReceipt(context.Background(), txHash)
		if err == nil {
			return receipt, nil
		}
		// 等待1秒后重试
		// time.Sleep(1 * time.Second)
		// 在本地测试网，交易会立即确认，所以直接返回错误
		return nil, err
	}
}

// Wei 转 Ether
func weiToEther(wei *big.Int) string {
	fbalance := new(big.Float)
	fbalance.SetString(wei.String())
	ethValue := new(big.Float).Quo(fbalance, big.NewFloat(1e18))
	return ethValue.Text('f', 6)
}

// Wei 转 Gwei
func weiToGwei(wei *big.Int) string {
	fbalance := new(big.Float)
	fbalance.SetString(wei.String())
	gweiValue := new(big.Float).Quo(fbalance, big.NewFloat(1e9))
	return gweiValue.Text('f', 2)
}

// Ether 转 Wei
func etherToWei(eth float64) *big.Int {
	ethBig := big.NewFloat(eth)
	weiBig := new(big.Float).Mul(ethBig, big.NewFloat(1e18))
	wei := new(big.Int)
	weiBig.Int(wei)
	return wei
}
