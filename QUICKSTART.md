# 🚀 快速开始指南

## 欢迎来到 Web3 世界！

这是一个为**完全零基础**的学习者设计的教程。你只需要：
- 高中数学水平
- 会用电脑
- 有耐心学习

## 📋 环境准备（只需5分钟）

### 1. 安装 Go

```bash
# macOS
brew install go

# 验证
go version  # 应该显示 go1.21 或更高
```

### 2. 安装 Node.js

```bash
# macOS
brew install node

# 验证
node --version  # 应该显示 v18 或更高
```

### 3. 安装 Solidity 编译器（可选）

```bash
# macOS
brew tap ethereum/ethereum
brew install solidity

# 验证
solc --version
```

## 🎓 学习路线（按顺序学）

### 🌱 第一周：基础概念

#### 第1课：什么是区块链？（30分钟）
```bash
cd lesson-01-blockchain-basics
go run main.go
```

**你会学到**：
- 区块链的基本原理（用账本类比）
- 为什么说它"不可篡改"
- 用 Go 模拟一个简单区块链

**关键概念**：区块、哈希、链式结构

---

#### 第2课：第一个智能合约（45分钟）
```bash
cd lesson-02-first-smart-contract
./run.sh
```

**你会学到**：
- 智能合约是什么（自动售货机）
- 写一个存钱罐合约
- 部署和测试

**关键概念**：Solidity、函数、事件

---

#### 第3课：用 Go 连接智能合约（1小时）
```bash
cd lesson-03-go-connect-contract
./run.sh
```

**你会学到**：
- Go 程序如何调用合约
- 什么是 ABI
- 监听合约事件

**关键概念**：RPC、ABI、绑定代码

---

#### 第4课：转账和余额查询（45分钟）
```bash
cd lesson-04-transfer-balance
./run.sh
```

**你会学到**：
- 如何转账 ETH
- 查询余额
- Wei/Gwei/ETH 转换
- Gas 费计算

**关键概念**：交易、Nonce、Gas

---

### 🌿 第二周：实用功能

#### 第5课：投票系统（1小时）
```bash
cd lesson-05-voting-system
./run.sh
```

**你会学到**：
- 复杂数据结构（struct、mapping）
- 状态管理
- 权限控制

**关键概念**：Mapping、Struct、Modifier

---

#### 第6课：简单的代币（1.5小时）
```bash
cd lesson-06-simple-token
./run.sh
```

**你会学到**：
- 什么是 ERC20
- 创建自己的代币
- 转账、授权、查询

**关键概念**：ERC20、代币标准、授权

---

#### 第7课：NFT 数字收藏品（1.5小时）
```bash
cd lesson-07-nft
./run.sh
```

**你会学到**：
- 什么是 NFT
- ERC721 标准
- 铸造和转移 NFT

**关键概念**：ERC721、tokenId、metadata

---

#### 第8课：去中心化交易所（2小时）
```bash
cd lesson-08-dex
./run.sh
```

**你会学到**：
- DEX 的基本原理
- 自动做市商（AMM）
- 流动性池

**关键概念**：流动性、滑点、手续费

---

## 💡 学习建议

### 每一课的学习方法

1. **先读 README.md**（10分钟）
   - 理解这一课要解决什么问题
   - 看人话解释和类比
   - 不要纠结细节

2. **运行代码**（5分钟）
   ```bash
   ./run.sh
   ```
   - 看看输出是什么
   - 对照预期输出

3. **读代码**（15-30分钟）
   - 从上到下读一遍
   - 看注释理解每一行
   - 不懂的先跳过

4. **改代码**（15-30分钟）
   - 改改数字，看会发生什么
   - 试试添加新功能
   - 故意制造错误，看看报错

5. **总结**（5分钟）
   - 这一课学到了什么？
   - 哪里还不懂？
   - 记录问题

### 遇到问题怎么办？

1. **看错误信息**
   - 大部分错误信息都很清楚
   - 用 Google 搜索错误信息

2. **重新运行**
   - 有时候只是网络问题
   - 重启终端试试

3. **检查环境**
   ```bash
   go version
   node --version
   ```

4. **从头开始**
   - 删除 `node_modules`
   - 重新运行 `./run.sh`

## 🎯 学习目标检查

### 第一周结束后，你应该能：

- [ ] 解释什么是区块链（用自己的话）
- [ ] 写一个简单的 Solidity 合约
- [ ] 用 Go 程序调用合约
- [ ] 发送一笔转账交易
- [ ] 理解 Gas 费是什么

### 第二周结束后，你应该能：

- [ ] 使用 mapping 和 struct
- [ ] 创建自己的代币
- [ ] 理解 NFT 的原理
- [ ] 解释 DEX 如何工作

## 📚 额外资源

### 官方文档

- [Solidity 文档](https://docs.soliditylang.org/)
- [Go-Ethereum 文档](https://geth.ethereum.org/docs)
- [以太坊官网](https://ethereum.org/)

### 学习网站

- [CryptoZombies](https://cryptozombies.io/) - 游戏化学习 Solidity
- [Ethernaut](https://ethernaut.openzeppelin.com/) - 安全挑战
- [Remix IDE](https://remix.ethereum.org/) - 在线 Solidity 编辑器

### 社区

- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [Reddit r/ethdev](https://reddit.com/r/ethdev)

## ⚠️ 重要提醒

### 安全第一

1. **永远不要**分享你的私钥
2. **永远不要**在主网测试未审计的代码
3. **永远不要**投入你输不起的钱

### 测试网络

- 本教程使用**本地测试网**（Hardhat）
- 完全免费，不需要真实的 ETH
- 可以随意实验

### 真实网络

如果要部署到真实网络：
1. 先用测试网（Goerli、Sepolia）
2. 代码审计
3. 小金额测试
4. 再考虑主网

## 🎉 准备好了吗？

从第1课开始吧：

```bash
cd lesson-01-blockchain-basics
go run main.go
```

祝你学习愉快！🚀

---

有问题？查看每一课的 README.md 或重新阅读这个文档。
