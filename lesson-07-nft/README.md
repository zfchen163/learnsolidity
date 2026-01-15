# 第7课：NFT 数字收藏品 🖼️

## 🎯 这一课你会学到

- 什么是 NFT
- ERC721 标准
- 如何铸造和转移 NFT
- NFT 和代币的区别

## 🤔 人话解释

### NFT = 数字收藏卡

想象你小时候收集的宝可梦卡片：

```
普通卡片：
- 每张都一样
- 可以互换
- 像钱一样（1元 = 1元）

稀有卡片：
- 每张都独一无二
- 不能互换
- 有编号（#001、#002）
- 像 NFT
```

**NFT 的特点**：
1. **独一无二**：每个都有唯一 ID
2. **不可分割**：不能拆成 0.5 个
3. **可证明所有权**：链上记录谁拥有
4. **可转让**：可以送人或卖掉

### NFT vs 代币

| 特性 | ERC20 代币 | ERC721 NFT |
|------|-----------|------------|
| 可替代性 | ✅ 可替代 | ❌ 不可替代 |
| 可分割性 | ✅ 可分割 | ❌ 不可分割 |
| 用途 | 货币、积分 | 收藏品、证书 |
| 例子 | USDT、UNI | CryptoPunks、无聊猿 |

### NFT 可以是什么？

1. **数字艺术**：画作、音乐、视频
2. **游戏道具**：武器、皮肤、宠物
3. **虚拟地产**：元宇宙的土地
4. **身份证明**：会员卡、学历证书
5. **门票**：演唱会、活动入场券
6. **域名**：ENS 域名（如 vitalik.eth）

## 📝 ERC721 标准

### 核心函数

```solidity
// 查询
balanceOf(owner) - 某人有几个 NFT
ownerOf(tokenId) - 某个 NFT 属于谁
tokenURI(tokenId) - NFT 的元数据

// 转移
transferFrom(from, to, tokenId) - 转移 NFT
safeTransferFrom(...) - 安全转移

// 授权
approve(to, tokenId) - 授权某人操作某个 NFT
setApprovalForAll(operator, approved) - 授权某人操作所有 NFT
```

### Metadata（元数据）

NFT 的详细信息存在 JSON 文件里：

```json
{
  "name": "无聊猿 #1234",
  "description": "一只戴墨镜的猿猴",
  "image": "ipfs://Qm.../1234.png",
  "attributes": [
    {"trait_type": "背景", "value": "蓝色"},
    {"trait_type": "眼睛", "value": "墨镜"},
    {"trait_type": "嘴巴", "value": "微笑"}
  ]
}
```

## 🎨 NFT 的生命周期

```
1. 铸造（Mint）
   创建者 → 铸造 NFT #1 → 发给买家

2. 持有（Hold）
   买家钱包里有 NFT #1

3. 转移（Transfer）
   买家 → 转给朋友 → 朋友收到

4. 销售（Sell）
   朋友 → 在 OpenSea 挂单 → 别人买走

5. 销毁（Burn）
   主人 → 销毁 NFT #1 → 永久消失
```

## 🚀 运行示例

```bash
cd lesson-07-nft
./run.sh
```

## 📊 预期输出

```
=== 🖼️ NFT 测试 ===

1️⃣  部署 NFT 合约
   NFT 名称: 我的NFT
   NFT 符号: MNFT
   总供应量: 0

2️⃣  铸造 NFT
   铸造 NFT #0: "第一幅画"
   ✅ 铸造成功
   主人: 0xf39Fd6...
   URI: ipfs://Qm.../0.json
   
   铸造 NFT #1: "第二幅画"
   ✅ 铸造成功
   
   铸造 NFT #2: "第三幅画"
   ✅ 铸造成功
   
   总供应量: 3

3️⃣  查询 NFT
   账户A 拥有: 3 个 NFT
   NFT #0 的主人: 0xf39Fd6...
   NFT #1 的主人: 0xf39Fd6...
   NFT #2 的主人: 0xf39Fd6...

4️⃣  转移 NFT
   转移 NFT #1 从 A 到 B
   ✅ 转移成功
   
   账户A 拥有: 2 个 NFT
   账户B 拥有: 1 个 NFT
   NFT #1 的主人: 0x70997... (账户B)

5️⃣  授权测试
   A 授权 C 可以操作 NFT #0
   ✅ 授权成功
   
   C 转移 NFT #0 给 D
   ✅ 转移成功
   NFT #0 的主人: 0x3C44C... (账户D)

=== ✅ 测试完成 ===
```

## 🔑 关键概念

### 1. TokenID

每个 NFT 都有唯一的 ID：

```
NFT #0
NFT #1
NFT #2
...
```

就像身份证号，全球唯一。

### 2. Metadata URI

指向 NFT 详细信息的链接：

```
ipfs://Qm.../metadata.json
https://api.example.com/nft/1
ar://abc123...
```

### 3. 铸造（Minting）

创建新的 NFT：

```solidity
function mint(address to, string memory uri) {
    uint256 tokenId = totalSupply;
    ownerOf[tokenId] = to;
    tokenURI[tokenId] = uri;
    totalSupply++;
}
```

### 4. 安全转移

`safeTransferFrom` 会检查接收方是否能处理 NFT：

```solidity
// 如果接收方是合约，必须实现 onERC721Received
function onERC721Received(...) returns (bytes4);
```

防止 NFT 被转到无法操作的合约里。

## 🎮 动手试试

1. **铸造你的 NFT**：改改名字、描述
2. **添加属性**：稀有度、等级
3. **实现功能**：
   - 限量发行（只能铸造 100 个）
   - 白名单铸造
   - 盲盒（铸造时不知道是什么）
4. **创建系列**：一套主题的 NFT

## ❓ 常见问题

**Q: NFT 的图片存在哪里？**
A: 
- 链上：太贵，很少用
- IPFS：去中心化存储，推荐
- 中心化服务器：便宜但不安全

**Q: NFT 可以复制吗？**
A: 
- 图片可以复制
- 但所有权不能复制
- 就像你可以打印蒙娜丽莎，但真品只有一幅

**Q: 为什么有人花几百万买 NFT？**
A: 
- 收藏价值
- 社区身份
- 投资/投机
- 支持艺术家

**Q: NFT 有版税吗？**
A: 
- ERC721 标准不包含版税
- 但可以自己实现（ERC2981）
- 交易平台可以强制收取

## 💡 著名的 NFT 项目

### 1. CryptoPunks
- 最早的 NFT 项目之一
- 10,000 个像素头像
- 最贵的卖了几千万美元

### 2. Bored Ape Yacht Club (BAYC)
- 无聊猿游艇俱乐部
- 10,000 只猿猴
- 持有者可以加入专属社区

### 3. Azuki
- 日系动漫风格
- 10,000 个角色
- 强调社区和文化

## 🎯 下一课预告

现在你理解 NFT 了！下一课我们会学习：
- **去中心化交易所（DEX）**
- 什么是 AMM（自动做市商）
- 如何交易代币
- 流动性池的原理

---

💡 **记住**：NFT 就像数字收藏卡，每个都独一无二！
