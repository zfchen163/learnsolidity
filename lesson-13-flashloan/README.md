# 第13课：闪电贷与套利 (Flash Loans) ⚡️

## 🎯 这一课你会学到
- 什么是闪电贷（一种“空手套白狼”的神奇技术）
- 为什么可以“无抵押贷款”
- 如何在 Aave 或 Uniswap 进行闪电贷
- 套利（Arbitrage）的基本原理
- 闪电贷攻击的防范

---

## 🙋‍♂️ 什么是闪电贷？

### 生活中的类比：神奇的当铺

想象你走进一家神奇的当铺：
1. **你**：“老板，我想借 1 亿美金，但是我一分钱抵押都没有。”
2. **老板**：“没问题！但是有一个条件：你必须在**走出这个店门之前**把钱还给我，外加一点点利息。”
3. **你**：“如果我走出门时没钱还呢？”
4. **老板**：“那我就当刚才什么都没发生，时空倒流，你从来没借过这笔钱。”

这就是 **闪电贷**。

### 为什么区块链能做到？

在区块链世界里，一个**交易（Transaction）**可以包含很多步操作。这些操作要么**全部成功**，要么**全部失败**（这叫**原子性**）。

闪电贷的流程在一个交易内完成：
1. 借款 1000 ETH
2.拿着这笔钱去赚钱（比如套利）
3. 归还 1000 ETH + 利息

如果在第 3 步你还不上钱，整个交易就会**Revert（回滚）**，就像第 1 步从来没发生过一样。借款方（比如 Aave）没有任何风险，所以不需要你提供抵押品！

---

## 💰 闪电贷有什么用？

既然只能借一瞬间，能拿来干嘛？

### 1. 套利 (Arbitrage) - “搬砖”
想象：
- **Uniswap** 上，1 ETH = 2000 USDT
- **SushiSwap** 上，1 ETH = 2010 USDT

**操作流程**：
1. **闪电贷**借出 2000 USDT。
2. 在 Uniswap 买入 1 ETH。
3. 在 SushiSwap 卖出 1 ETH，得到 2010 USDT。
4. **归还**闪电贷 2000 USDT + 0.9 USDT（手续费）。
5. **净赚** 9.1 USDT。

这一切都在**一眨眼**（一个交易块）内完成！你不需要有本金，只需要付一点 Gas 费。

### 2. 清算 (Liquidation)
帮助借贷协议清算资不抵债的用户，获得清算奖励，而不需要自己持有大量资金。

### 3. 抵押品转换
不用还款，直接把贷款的抵押品从 ETH 换成 WBTC。

---

## 🛠️ 实战：写一个简单的闪电贷合约

我们要使用 **Aave** 协议来实现闪电贷。

### 1. 准备工作
你需要引入 Aave 的接口文件。不用担心复杂，我们只看核心部分。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 你的合约继承自 Aave 的基础合约
contract MyFlashLoan is FlashLoanSimpleReceiverBase {

    constructor(address _addressProvider)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {}

    /**
     * 这是核心函数！当你借到钱后，Aave 会自动调用这个函数。
     * 你要在这里写你的赚钱逻辑。
     */
    function executeOperation(
        address asset,      // 借的什么币 (例如 USDC)
        uint256 amount,     // 借了多少
        uint256 premium,    // 需要付多少利息 (手续费)
        address initiator,  // 谁发起的 (就是你)
        bytes calldata params // 额外参数
    ) external override returns (bool) {
        
        // --- 1. 此时你的合约里已经有了借来的钱 (amount) ---
        
        // 在这里执行你的逻辑：
        // 比如：买低卖高、清算、换仓...
        
        // 模拟：我们什么都不做，只是打印一下
        // console.log("I borrowed:", amount);
        
        
        // --- 2. 计算需要还多少钱 ---
        uint256 amountOwed = amount + premium;
        
        // --- 3. 批准 Aave 把钱拿回去 ---
        IERC20(asset).approve(address(POOL), amountOwed);
        
        return true; // 告诉 Aave 一切顺利
    }

    // 发起闪电贷的入口函数
    function requestFlashLoan(address _token, uint256 _amount) public {
        address receiverAddress = address(this);
        address asset = _token;
        uint256 amount = _amount;
        bytes memory params = "";
        uint16 referralCode = 0;

        // 调用 Aave 的资金池
        POOL.flashLoanSimple(
            receiverAddress,
            asset,
            amount,
            params,
            referralCode
        );
    }
}
```

### 👨‍🏫 代码详解

1.  **`FlashLoanSimpleReceiverBase`**: 这是 Aave 提供的模板，继承它能少写很多代码。
2.  **`requestFlashLoan`**: 这是你手动调用的函数。它告诉 Aave：“嘿，借我 1000 USDC！”
3.  **`executeOperation`**: 这是 Aave **回调** 你的函数。
    - Aave 把钱转给你 -> Aave 暂停 -> **Aave 调用你的 `executeOperation`** -> 你操作资金 -> 你批准还款 -> 函数结束 -> Aave 恢复 -> Aave 拿回本金+利息。
    - 如果你算错了，最后没钱还，Aave 会报错，交易回滚。

---

## ⚠️ 闪电贷攻击 (Flash Loan Attack)

有些坏人利用闪电贷作恶。最常见的是 **价格操纵攻击**。

### 攻击剧本
1. **借钱**：黑客通过闪电贷借了 1 亿美金。
2. **砸盘**：在去中心化交易所（如 Uniswap）疯狂卖出，把某个币（比如 Token A）的价格砸得非常低。
3. **收割**：利用 Token A 价格极低的时候，去另一个依赖这个价格的 DeFi 协议（比如借贷平台）里，用很少的钱买走大量资产，或者进行不公平的清算。
4. **归位**：再把 Token A 的价格拉回去。
5. **还钱**：归还闪电贷，带走利润。

### 🛡️ 如何防御？
作为开发者，你的合约如何不被闪电贷攻击？

1.  **不要只依赖一个交易所的价格**：
    - 如果你的合约只读取 Uniswap 的当前价格，很容易被攻击。
    - **解决**：使用 **Chainlink 预言机**（第12课学过！），或者使用 **TWAP**（时间加权平均价格），它们很难瞬间被操纵。

2.  **防重入锁 (Reentrancy Guard)**：
    - 虽然闪电贷攻击主要关于价格操纵，但配合重入攻击更可怕。加上 `nonReentrant` 修饰符是个好习惯。

---

## 🧪 课后小作业

1.  **思考题**：如果闪电贷的手续费是 0.09%，你发现了一个套利机会，差价只有 0.05%，你应该做这个交易吗？
    - *答案提示*：亏本生意不要做！利润必须覆盖 借贷利息 + Gas 费。

2.  **动手题**（可选）：
    - 在测试网（Sepolia）部署上面的合约。
    - 尝试借出 100 USDC（前提是你的合约里得先有一点点 USDC 用来付利息，因为你借来的钱可能不够还利息）。

---

## 🚀 下一课预告
**第14课：DAO (去中心化自治组织)**
- 怎么用代码建立一个“没有老板的公司”？
- 什么是治理代币？
- 为什么投票这么难？

---
💡 **记住**：闪电贷是 DeFi 的“核武器”。用得好可以维护市场平衡（套利），用不好会摧毁整个协议（攻击）。
