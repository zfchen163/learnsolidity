# 第14课：DAO - 去中心化自治组织 🗳️

## 🎯 这一课你会学到
- 什么是 DAO（代码管理的社区）
- DAO 的三大件：代币、治理合约、时间锁
- 如何发起提案和投票
- 治理攻击与防范

---

## 🏛️ 什么是 DAO？

### 生活中的类比：没有校长的学生会

想象一个学生会：
- **没有校长**：没有一个人说了算。
- **每个人都有票**：所有决定（比如“周五买披萨”还是“买汉堡”）都要大家投票。
- **自动执行**：一旦投票通过，“买披萨机器人”就会自动下单，没人能赖账。

这就是 **DAO (Decentralized Autonomous Organization)**。
它的规则写在**智能合约**里，资金放在**国库（Treasury）**里，只有投票通过才能动用。

---

## 🧩 DAO 的核心三件套

要搭建一个 DAO，通常需要三个核心合约：

### 1. 治理代币 (Governor Token) - 你的“选票”
- 这是一个 ERC20 代币。
- **区别**：它有“快照”功能（Snapshot）。
- **为什么需要快照？** 如果没有快照，我可以在投票前一秒买入代币，投完票立刻卖掉。有了快照，系统会检查：“你在提案发起的那个区块，手里有多少币？”

### 2. 治理核心 (Governor) - “投票箱”与“裁判”
- 管理提案（Proposal）。
- 统计票数（For, Against, Abstain）。
- 宣布结果。

### 3. 时间锁 (Timelock) - “冷静期”
- 提案通过后，不会立刻执行。
- 需要等待一段时间（比如 2 天）。
- **作用**：如果通过了一个恶意提案（比如“把国库的钱全给我”），社区有 2 天时间反应（比如此时大家可以卖币离场，或者发起紧急否决）。

---

## 💻 代码实战：搭建一个迷你 DAO

我们将使用 OpenZeppelin 的标准库，这是最安全的方式。

### 第一步：治理代币 (MyVoteToken)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MyVoteToken is ERC20Votes {
    constructor() ERC20("DaoToken", "DTK") ERC20Permit("DaoToken") {
        // 给创建者发 1000 个币
        _mint(msg.sender, 1000 * 10**18);
    }

    // 下面这些是必须要重写的样板代码，照抄即可
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
}
```
> **注意**：持有代币不代表能投票！你需要执行 **`delegate(委托)`** 操作，把自己委托给自己，才能激活投票权。

### 第二步：时间锁 (MyTimelock)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract MyTimelock is TimelockController {
    // 最小延迟时间（比如 1 天），提议者名单，执行者名单
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(minDelay, proposers, executors, msg.sender) {}
}
```

### 第三步：治理核心 (MyGovernor)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract MyGovernor is 
    Governor, 
    GovernorSettings, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction, 
    GovernorTimelockControl 
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("MyGovernor")
        GovernorSettings(
            1,          // 投票延迟 (Voting Delay): 提案后多久开始投票 (1 block)
            45818,      // 投票周期 (Voting Period): 投票持续多久 (约 1 周)
            0           // 提案门槛 (Proposal Threshold): 持有多少币才能提议 (0)
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 法定人数 (Quorum): 需要 4% 的总供应量参与才算有效
        GovernorTimelockControl(_timelock)
    {}

    // 下面是必须的样板代码重写
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }
    
    // ... (其他重写函数，通常 IDE 会提示补全)
    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function _execute(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 🗳️ 治理流程全景图

```
用户操作                      合约状态
   │
   ▼
1. 创建提案 (Propose) ──────▶  Pending (等待期)
   │                           │
   │ (等待 Delay)               ▼
   │                          Active (投票进行中) ◀─── 2. 投票 (Vote)
   │                           │
   │ (等待 Period)              ▼
   │                          Succeeded / Defeated (结果出炉)
   │                           │
   ▼                           │ (如果通过)
3. 排队 (Queue) ────────────▶  Queued (进入时间锁)
   │                           │
   │ (等待 Timelock)            ▼
   ▼                          Executed (执行生效) ◀─── 4. 执行 (Execute)
   │                           │
   ▼                           ▼
国库转账/修改参数              完成！
```

---

## ☠️ DAO 的风险与治理攻击

### 1. 51% 攻击
如果一个人买下了 51% 的代币，他就可以通过任何提案，甚至把国库掏空。

### 2. 闪电贷治理攻击
黑客通过闪电贷借来巨量代币，进行投票，然后还币。
**防御**：
- 使用 `ERC20Votes` 的快照机制（Checkpoint）。
- 或者是设置 `Voting Delay`（投票延迟）。如果你在提案发起后才借币，那是没有用的，因为快照记录的是过去的状态。

### 3. 只有大户说了算？
很多 DAO 面临“冷漠”问题，小散户不投票。
**解决**：
- **流动性治理**。
- **二次方投票 (Quadratic Voting)**：通过数学公式平衡大户权重（1票=1元，100票=10000元），让少数人的声音也能被听见（稍高级，了解即可）。

---

## 🧪 课后小作业

1.  **部署**：在 Remix 上尝试部署这三个合约。
2.  **设置权限**：记得把 `Timelock` 的 **Proposer** 角色给 `Governor` 合约，把 **Executor** 角色给 `0x000...0` (代表任何人都可以执行)。
3.  **流程体验**：
    - 给自己发币，并 `delegate` 给自己。
    - 这里的 `Box` 合约有一个 `store(uint256)` 函数。
    - 发起提案：把 `Box` 的值改为 777。
    - 投票。
    - 等待，排队，执行。
    - 检查 `Box` 的值变了吗？

---

## 🚀 下一课预告
**第15课：Layer 2 与 扩展方案**
- 以太坊太贵太慢怎么办？
- Rollup 是什么？（把交易卷起来！）
- 乐观 Rollup vs ZK Rollup
- 如何把 DApp 部署到 Layer 2

---
💡 **记住**：DAO 是代码构建的民主，虽然不完美，但它是组织协作的一次伟大实验。
