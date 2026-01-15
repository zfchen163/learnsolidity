# 第10课：智能合约安全 🛡️

## 🎯 这一课你会学到

- 常见的智能合约漏洞
- 安全审计清单
- 攻击案例分析
- 防御最佳实践
- 安全工具使用

## ⚠️ 常见漏洞 Top 10

### 1. 重入攻击（Reentrancy）

**经典案例：The DAO Hack（2016，损失 $60M）**

```solidity
// ❌ 脆弱的代码
contract Vulnerable {
    mapping(address => uint256) public balances;
    
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        
        // 危险：先转账，后更新状态
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        
        balances[msg.sender] = 0; // 太晚了！
    }
}

// 攻击合约
contract Attacker {
    Vulnerable victim;
    
    constructor(address _victim) {
        victim = Vulnerable(_victim);
    }
    
    function attack() external payable {
        victim.deposit{value: 1 ether}();
        victim.withdraw();
    }
    
    // 重入点
    receive() external payable {
        if (address(victim).balance >= 1 ether) {
            victim.withdraw(); // 再次调用！
        }
    }
}
```

**防御方案：**

```solidity
// ✅ 方案1：Checks-Effects-Interactions 模式
function withdraw() public {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No balance");
    
    // 先更新状态
    balances[msg.sender] = 0;
    
    // 再转账
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// ✅ 方案2：ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Safe is ReentrancyGuard {
    function withdraw() public nonReentrant {
        // ...
    }
}

// ✅ 方案3：互斥锁
bool private locked;

modifier noReentrant() {
    require(!locked, "No reentrancy");
    locked = true;
    _;
    locked = false;
}
```

### 2. 整数溢出/下溢（Integer Overflow/Underflow）

```solidity
// ❌ Solidity < 0.8.0
contract Vulnerable {
    uint8 public count = 255;
    
    function increment() public {
        count++; // 溢出：255 + 1 = 0
    }
    
    function decrement() public {
        count--; // 下溢：0 - 1 = 255
    }
}

// ✅ Solidity >= 0.8.0（自动检查）
contract Safe {
    uint8 public count = 255;
    
    function increment() public {
        count++; // 会 revert
    }
}

// ✅ 使用 SafeMath（旧版本）
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Safe {
    using SafeMath for uint256;
    
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a.add(b); // 安全加法
    }
}

// ✅ 使用 unchecked（需要溢出时）
function unsafeIncrement(uint256 x) public pure returns (uint256) {
    unchecked {
        return x + 1; // 允许溢出，节省 Gas
    }
}
```

### 3. 访问控制漏洞

```solidity
// ❌ 没有访问控制
contract Vulnerable {
    address public owner;
    
    function withdraw() public {
        // 任何人都能调用！
        payable(owner).transfer(address(this).balance);
    }
}

// ✅ 正确的访问控制
contract Safe {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

// ✅ 使用 OpenZeppelin Ownable
import "@openzeppelin/contracts/access/Ownable.sol";

contract Safe is Ownable {
    function withdraw() public onlyOwner {
        // ...
    }
}

// ✅ 基于角色的访问控制（RBAC）
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Safe is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        // ...
    }
}
```

### 4. 前端运行（Front-Running）

```solidity
// ❌ 可被抢跑的交易
contract Vulnerable {
    uint256 public answer;
    uint256 public reward = 10 ether;
    
    function solve(uint256 _answer) public {
        if (_answer == answer) {
            payable(msg.sender).transfer(reward);
        }
    }
}

// 攻击者看到 mempool 中的正确答案，
// 用更高的 Gas 价格抢先提交

// ✅ 防御方案：Commit-Reveal 模式
contract Safe {
    mapping(address => bytes32) public commits;
    mapping(address => uint256) public revealTime;
    
    // 第一步：提交哈希
    function commit(bytes32 hash) public {
        commits[msg.sender] = hash;
        revealTime[msg.sender] = block.timestamp + 1 hours;
    }
    
    // 第二步：揭示答案
    function reveal(uint256 answer, bytes32 salt) public {
        require(block.timestamp >= revealTime[msg.sender], "Too early");
        require(
            commits[msg.sender] == keccak256(abi.encodePacked(answer, salt)),
            "Invalid reveal"
        );
        
        // 验证答案...
    }
}

// ✅ 使用 Flashbots 或私有交易池
```

### 5. 时间戳依赖

```solidity
// ❌ 依赖 block.timestamp
contract Vulnerable {
    function random() public view returns (uint256) {
        // 矿工可以操纵时间戳（±15秒）
        return uint256(keccak256(abi.encodePacked(block.timestamp)));
    }
}

// ✅ 使用 Chainlink VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Safe is VRFConsumerBase {
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public randomResult;
    
    function getRandomNumber() public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        return requestVRF(keyHash, fee);
    }
    
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        randomResult = randomness;
    }
}
```

### 6. 委托调用（Delegatecall）漏洞

```solidity
// ❌ 危险的 delegatecall
contract Vulnerable {
    address public owner;
    
    function forward(address target, bytes memory data) public {
        // 危险：target 可以修改 owner！
        (bool success, ) = target.delegatecall(data);
        require(success);
    }
}

contract Attacker {
    address public owner; // 相同的存储布局
    
    function attack() public {
        owner = msg.sender; // 修改调用者的 owner
    }
}

// ✅ 安全的 delegatecall
contract Safe {
    address public implementation;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function upgrade(address newImplementation) public onlyOwner {
        // 只允许 owner 修改
        implementation = newImplementation;
    }
    
    fallback() external payable {
        address impl = implementation;
        require(impl != address(0), "No implementation");
        
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
```

### 7. 自毁（Selfdestruct）漏洞

```solidity
// ❌ 依赖合约余额
contract Vulnerable {
    function withdraw() public {
        require(address(this).balance == 10 ether, "Wrong balance");
        // ...
    }
}

// 攻击者可以强制发送 ETH
contract Attacker {
    function attack(address target) public payable {
        selfdestruct(payable(target)); // 强制发送 ETH
    }
}

// ✅ 使用内部余额追踪
contract Safe {
    uint256 public internalBalance;
    
    function deposit() public payable {
        internalBalance += msg.value;
    }
    
    function withdraw() public {
        require(internalBalance == 10 ether, "Wrong balance");
        // ...
    }
}
```

### 8. 未初始化的存储指针

```solidity
// ❌ Solidity < 0.5.0
contract Vulnerable {
    struct User {
        address addr;
        uint256 balance;
    }
    
    User[] public users;
    
    function addUser() public {
        User storage user; // 未初始化，指向 slot 0！
        user.addr = msg.sender; // 覆盖了 users.length
    }
}

// ✅ 正确初始化
contract Safe {
    function addUser() public {
        User storage user = users.push();
        user.addr = msg.sender;
    }
}
```

### 9. 短地址攻击

```solidity
// ❌ 不检查输入长度
contract Vulnerable {
    function transfer(address to, uint256 amount) public {
        // EVM 会自动填充短地址
        // 0x1234 → 0x1234000000000000000000000000000000000000
    }
}

// ✅ 检查输入
contract Safe {
    function transfer(address to, uint256 amount) public {
        require(msg.data.length >= 68, "Short address");
        // ...
    }
}
```

### 10. 拒绝服务（DoS）

```solidity
// ❌ 依赖外部调用
contract Vulnerable {
    address[] public users;
    
    function distribute() public {
        for (uint256 i = 0; i < users.length; i++) {
            // 如果某个用户 revert，整个分发失败
            payable(users[i]).transfer(1 ether);
        }
    }
}

// ✅ Pull over Push 模式
contract Safe {
    mapping(address => uint256) public balances;
    
    function distribute() public {
        for (uint256 i = 0; i < users.length; i++) {
            balances[users[i]] += 1 ether;
        }
    }
    
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
```

## 🔍 安全审计清单

### 代码审查

```markdown
## 访问控制
- [ ] 所有敏感函数都有权限检查
- [ ] 使用 OpenZeppelin 的 Ownable/AccessControl
- [ ] 多签钱包用于关键操作

## 重入保护
- [ ] 使用 ReentrancyGuard
- [ ] 遵循 CEI 模式
- [ ] 避免在状态更新前调用外部合约

## 整数安全
- [ ] 使用 Solidity >= 0.8.0
- [ ] 或使用 SafeMath
- [ ] 检查除零错误

## 外部调用
- [ ] 检查返回值
- [ ] 使用 call 而不是 transfer/send
- [ ] 限制 Gas

## 随机数
- [ ] 不使用 block.timestamp/blockhash
- [ ] 使用 Chainlink VRF

## 升级
- [ ] 使用透明代理或 UUPS
- [ ] 时间锁
- [ ] 多签控制

## Gas 优化
- [ ] 避免无限循环
- [ ] 批量操作
- [ ] 存储优化

## 测试覆盖
- [ ] 单元测试 > 90%
- [ ] 集成测试
- [ ] 模糊测试
- [ ] 形式化验证
```

## 🛠️ 安全工具

### 1. Slither（静态分析）

```bash
pip3 install slither-analyzer

# 运行分析
slither contracts/MyContract.sol

# 输出报告
slither contracts/ --print human-summary
```

### 2. Mythril（符号执行）

```bash
pip3 install mythril

# 分析合约
myth analyze contracts/MyContract.sol
```

### 3. Echidna（模糊测试）

```bash
# 安装
docker pull trailofbits/eth-security-toolbox

# 运行
echidna-test contracts/MyContract.sol --contract MyContract
```

### 4. Foundry（测试框架）

```solidity
// test/MyContract.t.sol
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;
    
    function setUp() public {
        myContract = new MyContract();
    }
    
    function testFuzz_Transfer(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1000 ether);
        // 模糊测试
    }
    
    function testFail_Unauthorized() public {
        vm.prank(address(0x123));
        myContract.adminFunction(); // 应该失败
    }
}
```

## 📚 真实攻击案例

### 1. The DAO (2016) - $60M
- 漏洞：重入攻击
- 教训：CEI 模式，ReentrancyGuard

### 2. Parity Wallet (2017) - $150M
- 漏洞：未初始化的代理合约
- 教训：初始化检查，升级机制

### 3. Poly Network (2021) - $600M
- 漏洞：权限控制
- 教训：多签，时间锁

### 4. Ronin Bridge (2022) - $625M
- 漏洞：私钥泄露
- 教训：硬件钱包，密钥管理

## 🎯 最佳实践

### 1. 开发流程

```
1. 需求分析
   ↓
2. 威胁建模
   ↓
3. 安全设计
   ↓
4. 编码（遵循最佳实践）
   ↓
5. 单元测试
   ↓
6. 静态分析（Slither）
   ↓
7. 模糊测试（Echidna）
   ↓
8. 内部审计
   ↓
9. 外部审计（2-3 家）
   ↓
10. Bug Bounty
   ↓
11. 主网部署
   ↓
12. 持续监控
```

### 2. 代码规范

```solidity
// ✅ 良好的代码结构
pragma solidity ^0.8.0;

// 1. 导入
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 2. 接口
interface IMyInterface { }

// 3. 库
library MyLibrary { }

// 4. 合约
contract MyContract {
    // 4.1 类型声明
    struct MyStruct { }
    enum MyEnum { }
    
    // 4.2 状态变量
    uint256 public myVar;
    
    // 4.3 事件
    event MyEvent();
    
    // 4.4 修饰符
    modifier myModifier() { _; }
    
    // 4.5 构造函数
    constructor() { }
    
    // 4.6 外部函数
    function externalFunc() external { }
    
    // 4.7 公开函数
    function publicFunc() public { }
    
    // 4.8 内部函数
    function internalFunc() internal { }
    
    // 4.9 私有函数
    function privateFunc() private { }
}
```

### 3. 注释规范

```solidity
/**
 * @title MyContract
 * @author Your Name
 * @notice 简短描述
 * @dev 技术细节
 */
contract MyContract {
    /**
     * @notice 转账代币
     * @param to 接收地址
     * @param amount 转账金额
     * @return success 是否成功
     */
    function transfer(address to, uint256 amount) public returns (bool success) {
        // ...
    }
}
```

## 🚀 下一课预告

**第11课：可升级合约**
- 代理模式
- 透明代理 vs UUPS
- 存储冲突
- 初始化陷阱

---

💡 **记住**：安全是智能合约的生命线，永远不要低估攻击者的创造力！
