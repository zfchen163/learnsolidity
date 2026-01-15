# 第3课：用 Go 连接智能合约 🔗

## 🎯 这一课你会学到

- 如何用 Go 程序调用智能合约
- 什么是 ABI（合约的"说明书"）
- 如何监听合约事件
- 完整的 Go + Solidity 交互流程

## 🤔 人话解释

### Go 程序 ↔️ 智能合约

想象你要用遥控器（Go程序）控制电视（智能合约）：

```
遥控器（Go）  →  红外信号  →  电视（合约）
    ↓                            ↓
 按"音量+"               音量增加
    ↓                            ↓
 等待反馈      ←  状态更新  ←  发送信号
```

**需要解决的问题**：
1. **怎么找到电视？** → 合约地址
2. **遥控器和电视怎么对话？** → ABI（接口定义）
3. **怎么知道操作成功了？** → 监听事件

### ABI = 合约的"说明书"

ABI（Application Binary Interface）就像产品说明书：

```
说明书内容：
- 有哪些按钮（函数）
- 每个按钮做什么
- 需要什么参数
- 会返回什么结果
```

例如我们的存钱罐合约：

```
函数列表：
✅ deposit() - 存钱
✅ withdraw() - 取钱
✅ getBalance() - 查余额
✅ owner() - 查主人

事件列表：
📢 Deposited - 存钱时触发
📢 Withdrawn - 取钱时触发
```

## 💻 技术架构

```
┌─────────────────┐
│   Go 程序       │
│  (你的代码)     │
└────────┬────────┘
         │
         │ 1. 通过 RPC 连接
         ↓
┌─────────────────┐
│  以太坊节点     │
│  (Ganache/Geth) │
└────────┬────────┘
         │
         │ 2. 发送交易
         ↓
┌─────────────────┐
│   智能合约      │
│  (PiggyBank)    │
└─────────────────┘
```

## 🔧 工具链

### 1. abigen - ABI 生成器

`abigen` 是以太坊官方工具，可以把合约的 ABI 转换成 Go 代码：

```bash
# 安装
go install github.com/ethereum/go-ethereum/cmd/abigen@latest

# 使用
abigen --abi=PiggyBank.abi --pkg=contracts --type=PiggyBank --out=PiggyBank.go
```

生成的 Go 代码包含：
- 所有函数的 Go 封装
- 类型安全的参数
- 事件监听器

### 2. go-ethereum - Go 以太坊库

这是 Go 语言的以太坊客户端库，提供：
- 连接节点
- 发送交易
- 查询状态
- 监听事件

## 📝 完整流程

### 步骤1：编译合约，生成 ABI

```bash
solc --abi PiggyBank.sol -o build
```

生成 `PiggyBank.abi` 文件（JSON 格式）

### 步骤2：用 abigen 生成 Go 绑定

```bash
abigen --abi=build/PiggyBank.abi --pkg=contracts --type=PiggyBank --out=PiggyBank.go
```

生成 `PiggyBank.go` 文件（Go 代码）

### 步骤3：在 Go 中使用

```go
// 连接节点
client, _ := ethclient.Dial("http://localhost:8545")

// 加载合约
contract, _ := NewPiggyBank(contractAddress, client)

// 调用函数
balance, _ := contract.GetBalance(nil)
```

## 🚀 运行方式

```bash
cd lesson-03-go-connect-contract
./run.sh
```

这个脚本会：
1. 启动本地区块链（Hardhat）
2. 部署存钱罐合约
3. 生成 Go 绑定代码
4. 运行 Go 程序测试
5. 显示所有交互结果

## 📊 预期输出

```
=== 🔗 Go 连接智能合约测试 ===

1️⃣ 连接以太坊节点
   ✅ 已连接到: http://localhost:8545
   区块链ID: 1337
   最新区块: 12

2️⃣ 加载账户
   主人地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   主人余额: 9999.5 ETH

3️⃣ 加载合约
   合约地址: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   ✅ 合约加载成功

4️⃣ 查询合约信息
   合约主人: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   当前余额: 0 ETH
   存款次数: 0

5️⃣ 存入 1 ETH
   ✅ 交易已发送
   交易哈希: 0xabc123...
   ⏳ 等待确认...
   ✅ 交易已确认！
   Gas 使用: 45678
   新余额: 1 ETH

6️⃣ 再存入 0.5 ETH
   ✅ 交易已发送
   ✅ 交易已确认！
   新余额: 1.5 ETH
   存款次数: 2

7️⃣ 监听事件
   📢 收到 Deposited 事件:
      存款人: 0xf39Fd...
      金额: 1 ETH
      新余额: 1 ETH
   
   📢 收到 Deposited 事件:
      存款人: 0xf39Fd...
      金额: 0.5 ETH
      新余额: 1.5 ETH

8️⃣ 取出所有钱
   ✅ 取款成功！
   取出金额: 1.5 ETH
   新余额: 0 ETH

=== ✅ 测试完成 ===
```

## 🔑 关键概念

### 1. RPC（远程过程调用）

Go 程序通过 RPC 与以太坊节点通信：

```
Go 程序                     以太坊节点
   │                            │
   │──── eth_blockNumber ────→ │
   │←──── 返回: 12 ────────────│
   │                            │
   │──── eth_sendTransaction ─→│
   │←──── 返回: 交易哈希 ──────│
```

常见的 RPC 方法：
- `eth_blockNumber` - 获取最新区块号
- `eth_getBalance` - 查询余额
- `eth_sendTransaction` - 发送交易
- `eth_call` - 调用只读函数

### 2. TransactOpts vs CallOpts

**CallOpts**（只读操作）：
```go
// 不需要 Gas，不上链，免费
balance, _ := contract.GetBalance(&bind.CallOpts{})
```

**TransactOpts**（写操作）：
```go
// 需要 Gas，会上链，要花钱
auth, _ := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
tx, _ := contract.Deposit(auth, value)
```

### 3. 交易生命周期

```
1. 创建交易
   ↓
2. 签名（用私钥）
   ↓
3. 发送到节点
   ↓
4. 进入交易池（pending）
   ↓
5. 矿工打包进区块
   ↓
6. 区块确认
   ↓
7. 交易完成 ✅
```

### 4. 事件监听

智能合约可以发出事件，Go 程序可以监听：

```go
// 创建过滤器
filterOpts := &bind.FilterOpts{
    Start: 0,  // 从哪个区块开始
    End:   nil, // 到哪个区块（nil = 最新）
}

// 获取所有 Deposited 事件
iter, _ := contract.FilterDeposited(filterOpts, nil)

// 遍历事件
for iter.Next() {
    event := iter.Event
    fmt.Println("存款人:", event.Depositor)
    fmt.Println("金额:", event.Amount)
}
```

## 💡 代码结构

```
lesson-03-go-connect-contract/
├── README.md              # 说明文档
├── PiggyBank.sol         # 智能合约
├── deploy.js             # 部署脚本（Node.js）
├── main.go               # Go 主程序
├── contracts/            # 生成的 Go 绑定
│   └── PiggyBank.go     # 自动生成
├── run.sh                # 一键运行
└── hardhat.config.js     # Hardhat 配置
```

## 🎮 动手试试

运行代码后，试试这些：

1. **修改存款金额**：试试存不同的数额
2. **添加多个账户**：创建多个账户，让他们都存钱
3. **实时监听**：让程序一直运行，实时监听新的存款事件
4. **错误处理**：试试让非主人取钱，看看 Go 如何捕获错误

## ❓ 常见问题

**Q: 为什么要生成 Go 绑定，不能直接调用？**
A: 可以直接调用，但很麻烦：
- 要手动编码参数
- 要手动解码返回值
- 没有类型检查
生成的绑定代码帮你做了这些事。

**Q: 私钥怎么管理？**
A: 
- 开发环境：可以硬编码（仅测试！）
- 生产环境：用环境变量、密钥管理服务、硬件钱包

**Q: 交易失败了怎么办？**
A: 
- Gas 不够：增加 Gas Limit
- 权限不足：检查调用者
- 参数错误：检查函数参数
- 合约 revert：查看错误信息

**Q: 如何知道交易确认了？**
A: 
```go
// 方法1：等待收据
receipt, _ := bind.WaitMined(ctx, client, tx)

// 方法2：查询交易状态
receipt, _ := client.TransactionReceipt(ctx, tx.Hash())
```

## 🎯 下一课预告

现在你会用 Go 调用智能合约了！下一课我们会学习：
- **转账和余额查询**
- 发送 ETH 给其他地址
- 查询任意地址的余额
- 理解 Wei、Gwei、ETH 的转换

---

💡 **记住**：Go 程序通过 ABI 和 RPC 与智能合约通信，就像用遥控器控制电视！
