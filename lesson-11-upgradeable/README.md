# 第11课：可升级合约 🔄

## 🎯 这一课你会学到

- 为什么需要可升级合约
- 代理模式的原理
- 透明代理 vs UUPS vs Beacon
- 存储布局冲突
- 初始化陷阱
- 安全升级流程

## 🤔 为什么需要可升级合约？

### 传统合约的问题

```solidity
// ❌ 部署后无法修改
contract MyToken {
    function transfer(address to, uint256 amount) public {
        // 发现 bug 了！但是无法修改...
    }
}
```

**问题**：
- 无法修复 bug
- 无法添加新功能
- 无法优化 Gas
- 需要迁移所有数据

### 可升级合约的优势

```
V1 合约（有 bug）
↓ 升级
V2 合约（修复 bug）
↓ 升级
V3 合约（新功能）
```

**优势**：
- ✅ 可以修复 bug
- ✅ 可以添加功能
- ✅ 保留原有数据
- ✅ 保留原有地址

## 📐 代理模式原理

### 核心概念：delegatecall

```solidity
// 用户调用代理合约
Proxy.transfer() 
    ↓ delegatecall
// 执行逻辑合约的代码
Implementation.transfer()
    ↓
// 但修改的是代理合约的存储
Proxy.storage
```

**关键点**：
- `delegatecall` 在调用者的上下文中执行
- 代码在逻辑合约，数据在代理合约
- 升级只需要更换逻辑合约地址

### 基础代理合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleProxy - 最简单的代理合约
 */
contract SimpleProxy {
    // 逻辑合约地址（存储在固定 slot）
    address public implementation;
    
    constructor(address _implementation) {
        implementation = _implementation;
    }
    
    // 升级函数
    function upgradeTo(address newImplementation) external {
        implementation = newImplementation;
    }
    
    // 回退函数：转发所有调用
    fallback() external payable {
        address impl = implementation;
        
        assembly {
            // 复制 calldata
            calldatacopy(0, 0, calldatasize())
            
            // delegatecall 到逻辑合约
            let result := delegatecall(
                gas(),
                impl,
                0,
                calldatasize(),
                0,
                0
            )
            
            // 复制返回数据
            returndatacopy(0, 0, returndatasize())
            
            // 返回或 revert
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}
```

## 🏗️ 三种代理模式

### 1. 透明代理（Transparent Proxy）

**原理**：管理员和用户分开

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TransparentUpgradeableProxy
 * @notice OpenZeppelin 的透明代理实现
 */
contract TransparentUpgradeableProxy {
    // 存储槽（避免冲突）
    bytes32 private constant IMPLEMENTATION_SLOT = 
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant ADMIN_SLOT = 
        bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    
    constructor(address _logic, address _admin, bytes memory _data) {
        _setImplementation(_logic);
        _setAdmin(_admin);
        
        if (_data.length > 0) {
            (bool success, ) = _logic.delegatecall(_data);
            require(success);
        }
    }
    
    modifier ifAdmin() {
        if (msg.sender == _getAdmin()) {
            _;
        } else {
            _fallback();
        }
    }
    
    // 管理员函数
    function upgradeTo(address newImplementation) external ifAdmin {
        _setImplementation(newImplementation);
    }
    
    function changeAdmin(address newAdmin) external ifAdmin {
        _setAdmin(newAdmin);
    }
    
    function admin() external ifAdmin returns (address) {
        return _getAdmin();
    }
    
    function implementation() external ifAdmin returns (address) {
        return _getImplementation();
    }
    
    // 内部函数
    function _getAdmin() internal view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }
    
    function _setAdmin(address newAdmin) internal {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }
    
    function _getImplementation() internal view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function _setImplementation(address newImplementation) internal {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    function _fallback() internal {
        _delegate(_getImplementation());
    }
    
    function _delegate(address impl) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    fallback() external payable {
        _fallback();
    }
    
    receive() external payable {}
}
```

**特点**：
- ✅ 管理员和用户调用分离
- ✅ 避免函数选择器冲突
- ❌ 每次调用都要检查 msg.sender（Gas 高）

---

### 2. UUPS 代理（Universal Upgradeable Proxy Standard）

**原理**：升级逻辑在实现合约中

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title UUPSProxy - UUPS 代理
 * @notice 升级逻辑在实现合约中
 */
contract UUPSProxy {
    bytes32 private constant IMPLEMENTATION_SLOT = 
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    constructor(address _implementation, bytes memory _data) {
        _setImplementation(_implementation);
        
        if (_data.length > 0) {
            (bool success, ) = _implementation.delegatecall(_data);
            require(success);
        }
    }
    
    function _setImplementation(address newImplementation) private {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }
    
    function _getImplementation() internal view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    fallback() external payable {
        address impl = _getImplementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}

/**
 * @title MyContractV1 - UUPS 实现合约
 */
contract MyContractV1 is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    function setValue(uint256 newValue) public {
        value = newValue;
    }
    
    // UUPS 要求实现这个函数
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyOwner 
    {}
}

/**
 * @title MyContractV2 - 升级版本
 */
contract MyContractV2 is UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;
    uint256 public newValue; // 新增变量
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    function setValue(uint256 newValue_) public {
        value = newValue_;
    }
    
    // 新增函数
    function setNewValue(uint256 newValue_) public {
        newValue = newValue_;
    }
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyOwner 
    {}
}
```

**特点**：
- ✅ Gas 效率高（不需要检查 msg.sender）
- ✅ 代理合约简单
- ❌ 实现合约必须包含升级逻辑
- ⚠️ 如果升级逻辑有 bug，可能永久锁定

---

### 3. Beacon 代理（Beacon Proxy）

**原理**：多个代理共享一个 Beacon

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title UpgradeableBeacon
 * @notice 存储实现合约地址的 Beacon
 */
contract UpgradeableBeacon {
    address public implementation;
    address public owner;
    
    event Upgraded(address indexed implementation);
    
    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }
    
    function upgradeTo(address newImplementation) external {
        require(msg.sender == owner, "Not owner");
        implementation = newImplementation;
        emit Upgraded(newImplementation);
    }
}

/**
 * @title BeaconProxy
 * @notice 从 Beacon 读取实现地址的代理
 */
contract BeaconProxy {
    address public immutable beacon;
    
    constructor(address _beacon, bytes memory _data) {
        beacon = _beacon;
        
        if (_data.length > 0) {
            address impl = UpgradeableBeacon(_beacon).implementation();
            (bool success, ) = impl.delegatecall(_data);
            require(success);
        }
    }
    
    function _implementation() internal view returns (address) {
        return UpgradeableBeacon(beacon).implementation();
    }
    
    fallback() external payable {
        address impl = _implementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}
```

**使用场景**：
```solidity
// 部署 Beacon
UpgradeableBeacon beacon = new UpgradeableBeacon(implementationV1);

// 部署多个代理
BeaconProxy proxy1 = new BeaconProxy(address(beacon), data1);
BeaconProxy proxy2 = new BeaconProxy(address(beacon), data2);
BeaconProxy proxy3 = new BeaconProxy(address(beacon), data3);

// 一次升级，所有代理都升级
beacon.upgradeTo(implementationV2);
```

**特点**：
- ✅ 批量升级多个合约
- ✅ 节省 Gas（只需升级一次）
- ✅ 适合 NFT 系列等场景
- ❌ 所有代理必须同时升级

---

## ⚠️ 存储布局冲突

### 问题：存储槽冲突

```solidity
// ❌ 错误示例
contract ProxyV1 {
    address public implementation; // slot 0
    uint256 public value;          // slot 1
}

contract ImplementationV1 {
    uint256 public data;           // slot 0 ⚠️ 冲突！
}
```

**结果**：`data` 会覆盖 `implementation`！

### 解决方案1：预留槽位

```solidity
// ✅ 正确：代理合约预留槽位
contract Proxy {
    // slot 0-49: 代理使用
    address private _implementation;
    address private _admin;
    // ... 预留 48 个槽位
    
    // slot 50+: 实现合约使用
}

contract Implementation {
    // 跳过前 50 个槽位
    uint256[50] private __gap;
    
    // 从 slot 50 开始
    uint256 public data;
}
```

### 解决方案2：EIP-1967 标准槽位

```solidity
// ✅ 使用随机槽位（不会冲突）
bytes32 private constant IMPLEMENTATION_SLOT = 
    bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
// = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc

bytes32 private constant ADMIN_SLOT = 
    bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
// = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
```

### 解决方案3：使用 __gap

```solidity
contract MyContractV1 {
    uint256 public value1;
    uint256 public value2;
    
    // 预留 48 个槽位，总共 50 个
    uint256[48] private __gap;
}

contract MyContractV2 {
    uint256 public value1;
    uint256 public value2;
    uint256 public value3; // 新增
    
    // 减少 1 个槽位
    uint256[47] private __gap;
}
```

---

## 🔧 初始化陷阱

### 问题：构造函数不会执行

```solidity
// ❌ 错误：构造函数在代理上下文中不执行
contract Implementation {
    address public owner;
    
    constructor() {
        owner = msg.sender; // 不会设置到代理的存储！
    }
}
```

### 解决方案：使用 initialize

```solidity
// ✅ 正确：使用 initialize 函数
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Implementation is Initializable {
    address public owner;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // 防止实现合约被初始化
    }
    
    function initialize(address _owner) public initializer {
        owner = _owner;
    }
}
```

### 防止重复初始化

```solidity
contract Initializable {
    uint8 private _initialized;
    bool private _initializing;
    
    modifier initializer() {
        require(
            _initializing || _initialized < 1,
            "Already initialized"
        );
        
        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = 1;
        }
        
        _;
        
        if (isTopLevelCall) {
            _initializing = false;
        }
    }
    
    function _disableInitializers() internal {
        _initialized = type(uint8).max;
    }
}
```

---

## 🔐 安全升级流程

### 1. 开发和测试

```bash
# 1. 编写新版本
# 2. 单元测试
npx hardhat test

# 3. 升级测试
npx hardhat run scripts/test-upgrade.js

# 4. 存储布局检查
npx hardhat run scripts/check-storage.js
```

### 2. 审计

```bash
# 静态分析
slither contracts/

# 升级安全检查
npx @openzeppelin/upgrades-core validate
```

### 3. 时间锁升级

```solidity
// ✅ 使用 Timelock 延迟升级
import "@openzeppelin/contracts/governance/TimelockController.sol";

contract UpgradeGovernor {
    TimelockController public timelock;
    
    function scheduleUpgrade(
        address proxy,
        address newImplementation
    ) external onlyOwner {
        // 48 小时后才能执行
        timelock.schedule(
            proxy,
            0,
            abi.encodeWithSignature(
                "upgradeTo(address)",
                newImplementation
            ),
            bytes32(0),
            bytes32(0),
            48 hours
        );
    }
    
    function executeUpgrade(
        address proxy,
        address newImplementation
    ) external {
        timelock.execute(
            proxy,
            0,
            abi.encodeWithSignature(
                "upgradeTo(address)",
                newImplementation
            ),
            bytes32(0),
            bytes32(0)
        );
    }
}
```

### 4. 多签控制

```solidity
// ✅ 使用 Gnosis Safe 多签
// 需要 3/5 签名才能升级
```

---

## 📊 三种代理对比

| 特性 | 透明代理 | UUPS | Beacon |
|------|----------|------|--------|
| Gas 效率 | 低 | 高 | 中 |
| 代理复杂度 | 高 | 低 | 中 |
| 实现复杂度 | 低 | 高 | 低 |
| 升级风险 | 低 | 中 | 低 |
| 批量升级 | ❌ | ❌ | ✅ |
| 推荐场景 | 单个合约 | 单个合约 | NFT 系列 |

---

## 🎯 最佳实践

### 1. 存储管理

```solidity
// ✅ 只在末尾添加变量
contract V1 {
    uint256 public a;
    uint256 public b;
}

contract V2 {
    uint256 public a;
    uint256 public b;
    uint256 public c; // ✅ 在末尾添加
}

// ❌ 不要改变顺序
contract V2Bad {
    uint256 public c; // ❌ 不要插入
    uint256 public a;
    uint256 public b;
}
```

### 2. 函数选择器

```solidity
// ✅ 不要删除函数
// ✅ 不要改变函数签名
// ✅ 可以添加新函数
```

### 3. 初始化

```solidity
// ✅ 使用 initializer 修饰符
// ✅ 在构造函数中禁用初始化器
// ✅ 升级后可以添加新的初始化函数

function initializeV2() public reinitializer(2) {
    // V2 的初始化逻辑
}
```

---

## 🛠️ 实战：升级 ERC20

```solidity
// V1: 基础 ERC20
contract MyTokenV1 is Initializable, ERC20Upgradeable {
    function initialize(string memory name, string memory symbol) 
        public 
        initializer 
    {
        __ERC20_init(name, symbol);
    }
}

// V2: 添加暂停功能
contract MyTokenV2 is Initializable, ERC20Upgradeable, PausableUpgradeable {
    function initialize(string memory name, string memory symbol) 
        public 
        initializer 
    {
        __ERC20_init(name, symbol);
        __Pausable_init();
    }
    
    function pause() public {
        _pause();
    }
    
    function unpause() public {
        _unpause();
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
```

---

## 🚀 下一课预告

**第12课：预言机和链下数据**
- Chainlink 价格预言机
- Chainlink VRF（随机数）
- Chainlink Automation
- 自定义预言机
- TWAP

---

💡 **记住**：可升级合约很强大，但也很危险。务必谨慎升级，充分测试！
