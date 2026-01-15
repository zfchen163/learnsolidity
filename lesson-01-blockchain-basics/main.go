package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// 区块结构 - 就像账本的一页
type Block struct {
	Index        int       // 第几页（区块编号）
	Timestamp    time.Time // 什么时候写的（时间戳）
	Data         string    // 这一页记录了什么（交易数据）
	PreviousHash string    // 上一页的指纹（前一个区块的哈希）
	Hash         string    // 这一页的指纹（当前区块的哈希）
}

// 区块链结构 - 整本账本
type Blockchain struct {
	Blocks []*Block // 所有的区块（页）
}

// 计算区块的哈希值（指纹）
func (b *Block) CalculateHash() string {
	// 把区块的所有信息拼成一个字符串
	record := fmt.Sprintf("%d%s%s%s",
		b.Index,
		b.Timestamp.String(),
		b.Data,
		b.PreviousHash,
	)

	// 用 SHA256 算法计算指纹
	hash := sha256.Sum256([]byte(record))

	// 转成16进制字符串（更容易阅读）
	return hex.EncodeToString(hash[:])
}

// 创建新区块
func NewBlock(index int, data string, previousHash string) *Block {
	block := &Block{
		Index:        index,
		Timestamp:    time.Now(),
		Data:         data,
		PreviousHash: previousHash,
	}

	// 计算这个区块的哈希值
	block.Hash = block.CalculateHash()

	return block
}

// 创建创世区块（第一个区块）
func CreateGenesisBlock() *Block {
	return NewBlock(0, "创世区块 - 区块链的起点", "0")
}

// 创建新的区块链
func NewBlockchain() *Blockchain {
	// 区块链的第一个区块叫"创世区块"
	return &Blockchain{
		Blocks: []*Block{CreateGenesisBlock()},
	}
}

// 获取最后一个区块
func (bc *Blockchain) GetLatestBlock() *Block {
	return bc.Blocks[len(bc.Blocks)-1]
}

// 添加新区块到区块链
func (bc *Blockchain) AddBlock(data string) {
	// 获取上一个区块
	previousBlock := bc.GetLatestBlock()

	// 创建新区块
	newBlock := NewBlock(
		previousBlock.Index+1, // 编号+1
		data,                  // 新的交易数据
		previousBlock.Hash,    // 上一个区块的哈希
	)

	// 添加到区块链
	bc.Blocks = append(bc.Blocks, newBlock)

	fmt.Printf("\n添加新区块: %s\n", data)
}

// 验证区块链是否有效（有没有被篡改）
func (bc *Blockchain) IsValid() bool {
	// 从第二个区块开始检查（第一个是创世区块）
	for i := 1; i < len(bc.Blocks); i++ {
		currentBlock := bc.Blocks[i]
		previousBlock := bc.Blocks[i-1]

		// 检查1：当前区块的哈希是否正确
		if currentBlock.Hash != currentBlock.CalculateHash() {
			fmt.Printf("❌ 警告：区块 #%d 的哈希值不正确！\n", i)
			fmt.Printf("   期望: %s\n", currentBlock.Hash)
			fmt.Printf("   实际: %s\n", currentBlock.CalculateHash())
			return false
		}

		// 检查2：当前区块是否正确指向上一个区块
		if currentBlock.PreviousHash != previousBlock.Hash {
			fmt.Printf("❌ 警告：区块 #%d 被篡改了！\n", i)
			fmt.Printf("   期望的上一个区块指纹: %s\n", previousBlock.Hash)
			fmt.Printf("   实际记录的指纹: %s\n", currentBlock.PreviousHash)
			return false
		}
	}

	return true
}

// 打印区块信息（格式化输出）
func (b *Block) Print() {
	fmt.Printf("\n区块 #%d", b.Index)
	if b.Index == 0 {
		fmt.Printf(" (创世区块)")
	}
	fmt.Printf("\n")
	fmt.Printf("时间: %s\n", b.Timestamp.Format("2006-01-02 15:04:05"))
	fmt.Printf("数据: %s\n", b.Data)
	fmt.Printf("上一个区块指纹: %s\n", b.PreviousHash)
	fmt.Printf("当前区块指纹: %s\n", b.Hash[:16]+"...")
	fmt.Println(strings.Repeat("-", 50))
}

// 打印整个区块链
func (bc *Blockchain) Print() {
	for _, block := range bc.Blocks {
		block.Print()
	}
}

func main() {
	fmt.Println("=== 创建区块链 ===")

	// 1. 创建一个新的区块链（自动包含创世区块）
	blockchain := NewBlockchain()

	// 打印创世区块
	blockchain.GetLatestBlock().Print()

	// 2. 添加一些交易
	time.Sleep(1 * time.Second) // 等1秒，让时间戳不同
	blockchain.AddBlock("小明转给小红 10 元")
	blockchain.GetLatestBlock().Print()

	time.Sleep(1 * time.Second)
	blockchain.AddBlock("小红转给小刚 5 元")
	blockchain.GetLatestBlock().Print()

	time.Sleep(1 * time.Second)
	blockchain.AddBlock("小刚转给小明 3 元")
	blockchain.GetLatestBlock().Print()

	// 3. 验证区块链的完整性
	fmt.Println("\n=== 验证区块链完整性 ===")
	if blockchain.IsValid() {
		fmt.Println("✅ 区块链完整，没有被篡改！")
	} else {
		fmt.Println("❌ 区块链已被篡改！")
	}

	// 4. 模拟篡改：改掉第1个区块的数据
	fmt.Println("\n=== 尝试篡改数据 ===")
	fmt.Println("😈 黑客尝试把'10元'改成'1000元'...")
	blockchain.Blocks[1].Data = "小明转给小红 1000 元"

	// 再次验证
	if blockchain.IsValid() {
		fmt.Println("✅ 区块链完整")
	} else {
		fmt.Println("❌ 检测到篡改！区块链系统会拒绝这个版本。")
	}

	// 5. 展示完整的区块链
	fmt.Println("\n=== 完整的区块链 ===")
	blockchain.Print()

	// 6. 可视化展示链式结构
	fmt.Println("\n=== 区块链结构可视化 ===")
	for i, block := range blockchain.Blocks {
		if i == 0 {
			fmt.Printf("[区块%d: %s]", i, block.Hash[:8])
		} else {
			fmt.Printf(" → [区块%d: %s]", i, block.Hash[:8])
		}
	}
	fmt.Println("\n")

	// 7. 总结
	fmt.Println("=== 💡 关键点 ===")
	fmt.Println("1. 每个区块都包含上一个区块的哈希值")
	fmt.Println("2. 改变任何一个区块的数据，它的哈希值就会改变")
	fmt.Println("3. 这会导致后面所有区块的链接断裂")
	fmt.Println("4. 这就是为什么区块链'不可篡改'！")
}
