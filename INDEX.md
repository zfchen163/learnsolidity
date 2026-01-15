# 📑 快速索引 - 一页看完所有内容

## 🎯 我想...

### 开始学习
→ 阅读 [QUICKSTART.md](QUICKSTART.md)

### 了解项目概况
→ 阅读 [README.md](README.md)

### 查看学习进度
→ 阅读 [SUMMARY.md](SUMMARY.md)

### 快速查找某个概念
→ 使用下面的概念索引

---

## 📚 课程快速跳转

| 课程 | 核心概念 | 代码文件 | 运行命令 |
|------|----------|----------|----------|
| [第1课](lesson-01-blockchain-basics/) | 区块链原理 | `main.go` | `go run main.go` |
| [第2课](lesson-02-first-smart-contract/) | 智能合约 | `PiggyBank.sol` | `./run.sh` |
| [第3课](lesson-03-go-connect-contract/) | Go 连接合约 | `main.go` | `./run.sh` |
| [第4课](lesson-04-transfer-balance/) | 转账 | `main.go` | `./run.sh` |
| [第5课](lesson-05-voting-system/) | 投票系统 | `Voting.sol` | - |
| [第6课](lesson-06-simple-token/) | ERC20 代币 | `SimpleToken.sol` | - |
| [第7课](lesson-07-nft/) | NFT | `SimpleNFT.sol` | - |
| [第8课](lesson-08-dex/) | DEX | `SimpleDEX.sol` | - |

---

## 🔍 概念索引

### A
- **ABI** (Application Binary Interface) → 第3课
- **AMM** (自动做市商) → 第8课
- **Address** (地址) → 第2课

### B
- **Block** (区块) → 第1课
- **Blockchain** (区块链) → 第1课

### D
- **DEX** (去中心化交易所) → 第8课
- **DeFi** → 第8课

### E
- **ERC20** → 第6课
- **ERC721** → 第7课
- **Event** (事件) → 第2课
- **Ether** (以太币) → 第4课

### G
- **Gas** (燃料费) → 第2课, 第4课
- **Gwei** → 第4课

### H
- **Hash** (哈希) → 第1课
- **Hardhat** → 第2课

### L
- **Liquidity** (流动性) → 第8课

### M
- **Mapping** (映射) → 第5课
- **Metadata** (元数据) → 第7课
- **Mint** (铸造) → 第7课
- **Modifier** (修饰符) → 第5课

### N
- **NFT** (非同质化代币) → 第7课
- **Nonce** → 第4课

### P
- **Payable** → 第2课
- **Private Key** (私钥) → 第3课

### R
- **RPC** → 第3课
- **Require** → 第2课

### S
- **Slippage** (滑点) → 第8课
- **Smart Contract** (智能合约) → 第2课
- **Solidity** → 第2课
- **Struct** (结构体) → 第5课

### T
- **Token** (代币) → 第6课
- **Transaction** (交易) → 第4课
- **Transfer** (转账) → 第4课, 第6课

### W
- **Wallet** (钱包) → 第3课
- **Wei** → 第4课

---

## 🛠️ 代码模式索引

### Solidity 模式

#### 基本合约结构
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    // 状态变量
    address public owner;
    
    // 构造函数
    constructor() {
        owner = msg.sender;
    }
    
    // 函数
    function myFunction() public {
        // ...
    }
}
```
→ 第2课

#### Mapping 使用
```solidity
mapping(address => uint256) public balanceOf;
mapping(address => mapping(address => uint256)) public allowance;
```
→ 第5课, 第6课

#### Struct 使用
```solidity
struct Candidate {
    uint id;
    string name;
    uint voteCount;
}
Candidate[] public candidates;
```
→ 第5课

#### 事件
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
emit Transfer(msg.sender, to, amount);
```
→ 第2课, 第6课

#### 修饰符
```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "只有主人");
    _;
}
```
→ 第5课

### Go 模式

#### 连接节点
```go
client, err := ethclient.Dial("http://localhost:8545")
```
→ 第3课, 第4课

#### 加载合约
```go
contract, err := NewPiggyBank(contractAddress, client)
```
→ 第3课

#### 只读调用
```go
balance, err := contract.GetBalance(&bind.CallOpts{})
```
→ 第3课

#### 写操作
```go
auth, _ := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
tx, err := contract.Deposit(auth)
```
→ 第3课

#### 转账
```go
tx := types.NewTransaction(nonce, to, amount, gasLimit, gasPrice, nil)
signedTx, _ := types.SignTx(tx, signer, privateKey)
client.SendTransaction(ctx, signedTx)
```
→ 第4课

#### 单位转换
```go
// Wei → ETH
ethValue := new(big.Float).Quo(wei, big.NewFloat(1e18))

// ETH → Wei
wei := new(big.Float).Mul(eth, big.NewFloat(1e18))
```
→ 第4课

---

## 🎨 类比索引

| 概念 | 类比 | 课程 |
|------|------|------|
| 区块链 | 班级账本 | 第1课 |
| 智能合约 | 自动售货机 | 第2课 |
| Gas | 电费/快递费 | 第2课 |
| ABI | 产品说明书 | 第3课 |
| 代币 | 游戏币 | 第6课 |
| NFT | 收藏卡 | 第7课 |
| DEX | 自动兑换机 | 第8课 |
| LP | 银行存款 | 第8课 |

---

## 📊 难度梯度

```
⭐ 简单
├─ 第1课：区块链基础
└─ 第2课：智能合约

⭐⭐ 中等
├─ 第3课：Go 连接合约
└─ 第4课：转账

⭐⭐⭐ 进阶
├─ 第5课：投票系统
├─ 第6课：ERC20 代币
└─ 第7课：NFT

⭐⭐⭐⭐ 高级
└─ 第8课：DEX
```

---

## 🔧 工具索引

### 开发工具
- **Hardhat** - 以太坊开发环境 → 第2课
- **Remix** - 在线 IDE → 推荐资源
- **abigen** - Go 绑定生成器 → 第3课

### 库和框架
- **go-ethereum** - Go 以太坊库 → 第3课
- **ethers.js** - JavaScript 以太坊库 → 第2课

### 测试网络
- **Hardhat Network** - 本地测试网 → 所有课程
- **Ganache** - 本地区块链 → 可选

---

## 📖 学习路径推荐

### 路径1：快速入门（3天）
```
Day 1: 第1课 + 第2课
Day 2: 第3课 + 第4课
Day 3: 第6课（代币）
```

### 路径2：完整学习（2周）
```
Week 1: 第1-4课（基础）
Week 2: 第5-8课（进阶）
```

### 路径3：深度学习（1个月）
```
Week 1: 第1-4课 + 实践项目
Week 2: 第5-6课 + 创建自己的代币
Week 3: 第7-8课 + NFT 项目
Week 4: 综合项目 + 代码审计
```

---

## 🎯 按目标查找

### 我想理解原理
→ 第1课（区块链）、第8课（DEX）

### 我想写合约
→ 第2课（基础）、第5课（状态管理）

### 我想做后端
→ 第3课（Go 连接）、第4课（转账）

### 我想做 DeFi
→ 第6课（代币）、第8课（DEX）

### 我想做 NFT
→ 第7课（NFT）

### 我想做 DAO
→ 第5课（投票）

---

## 🆘 问题排查

### 编译错误
→ 检查 Solidity 版本 → 第2课 README

### 连接失败
→ 检查节点是否启动 → 第3课 README

### Gas 不够
→ 增加 Gas Limit → 第4课 README

### 交易失败
→ 检查余额和授权 → 第4课、第6课 README

---

## 📱 快速命令

```bash
# 查看所有课程
ls -la lesson-*

# 运行第1课
cd lesson-01-blockchain-basics && go run main.go

# 运行第2课
cd lesson-02-first-smart-contract && ./run.sh

# 清理所有编译产物
find . -name "node_modules" -type d -exec rm -rf {} +
find . -name "artifacts" -type d -exec rm -rf {} +
find . -name "cache" -type d -exec rm -rf {} +
```

---

**💡 提示**：把这个文件加入书签，方便快速查找！
