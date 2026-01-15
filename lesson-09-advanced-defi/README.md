# 第9课：高级 DeFi - 借贷协议 🏦

## 🎯 这一课你会学到

- Compound/Aave 式借贷协议的原理
- 超额抵押和清算机制
- 利率模型（线性、指数）
- 闪电贷基础
- 预言机集成

## 🤔 核心概念

### 借贷协议的本质

```
传统银行：
存款 → 银行 → 贷款
利息差 = 银行利润

DeFi 借贷：
存款 → 智能合约 → 贷款
利息差 = 协议收入 + LP 收益
```

### 关键机制

1. **超额抵押**
   ```
   抵押 100 ETH（价值 $200,000）
   借出 60,000 USDT（抵押率 150%）
   
   如果 ETH 跌到 $1,500：
   抵押价值 = $150,000
   抵押率 = 150,000 / 60,000 = 250%（安全）
   
   如果 ETH 跌到 $1,200：
   抵押价值 = $120,000
   抵押率 = 120,000 / 60,000 = 200%（接近清算线）
   
   如果 ETH 跌到 $900：
   抵押价值 = $90,000
   抵押率 = 90,000 / 60,000 = 150%（触发清算）
   ```

2. **清算机制**
   ```
   清算人发现抵押率不足
   ↓
   支付借款金额 + 罚金
   ↓
   获得抵押物 + 清算奖励（5-10%）
   ↓
   套利机会
   ```

3. **利率模型**
   ```
   使用率 = 借出量 / 总存款量
   
   低使用率（0-80%）：
   利率 = 基础利率 + 使用率 × 斜率1
   
   高使用率（80-100%）：
   利率 = 基础利率 + 80% × 斜率1 + (使用率-80%) × 斜率2
   
   例如：
   使用率 50%：借款利率 5%，存款利率 2.5%
   使用率 90%：借款利率 25%，存款利率 22.5%
   ```

## 💻 生产级代码

### LendingPool.sol - 借贷池核心

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LendingPool - 生产级借贷协议
 * @notice 支持多资产抵押、动态利率、清算机制
 */
contract LendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // ========== 数据结构 ==========
    
    struct Market {
        bool isListed;              // 是否支持
        uint256 collateralFactor;   // 抵押率（基点，10000 = 100%）
        uint256 liquidationThreshold; // 清算阈值
        uint256 liquidationBonus;   // 清算奖励
        uint256 totalDeposits;      // 总存款
        uint256 totalBorrows;       // 总借款
        uint256 borrowIndex;        // 累计借款指数
        uint256 lastUpdateTime;     // 最后更新时间
        InterestRateModel rateModel; // 利率模型
    }
    
    struct UserDeposit {
        uint256 amount;             // 存款金额
        uint256 shares;             // 份额
    }
    
    struct UserBorrow {
        uint256 principal;          // 本金
        uint256 borrowIndex;        // 借款时的指数
    }
    
    struct InterestRateModel {
        uint256 baseRate;           // 基础利率（年化，基点）
        uint256 multiplier;         // 斜率1
        uint256 jumpMultiplier;     // 斜率2
        uint256 kink;               // 拐点（使用率）
    }
    
    // ========== 状态变量 ==========
    
    mapping(address => Market) public markets;
    mapping(address => mapping(address => UserDeposit)) public deposits;
    mapping(address => mapping(address => UserBorrow)) public borrows;
    mapping(address => address[]) public userCollaterals;
    mapping(address => address[]) public userBorrows;
    
    address public priceOracle;
    uint256 public constant CLOSE_FACTOR = 5000; // 50%
    uint256 public constant LIQUIDATION_INCENTIVE = 10500; // 105%
    
    // ========== 事件 ==========
    
    event MarketListed(address indexed token, uint256 collateralFactor);
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Liquidate(
        address indexed liquidator,
        address indexed borrower,
        address indexed collateralToken,
        address borrowToken,
        uint256 repayAmount,
        uint256 seizeAmount
    );
    
    // ========== 核心功能 ==========
    
    /**
     * @notice 添加支持的市场
     */
    function listMarket(
        address token,
        uint256 collateralFactor,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        InterestRateModel memory rateModel
    ) external onlyOwner {
        require(!markets[token].isListed, "Market already listed");
        require(collateralFactor <= 9000, "Collateral factor too high");
        require(liquidationThreshold > collateralFactor, "Invalid threshold");
        
        markets[token] = Market({
            isListed: true,
            collateralFactor: collateralFactor,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            totalDeposits: 0,
            totalBorrows: 0,
            borrowIndex: 1e18,
            lastUpdateTime: block.timestamp,
            rateModel: rateModel
        });
        
        emit MarketListed(token, collateralFactor);
    }
    
    /**
     * @notice 存款
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(markets[token].isListed, "Market not listed");
        require(amount > 0, "Amount must be > 0");
        
        // 更新利率
        accrueInterest(token);
        
        Market storage market = markets[token];
        
        // 计算份额
        uint256 shares;
        if (market.totalDeposits == 0) {
            shares = amount;
        } else {
            shares = (amount * getTotalShares(token)) / market.totalDeposits;
        }
        
        // 更新状态
        deposits[msg.sender][token].amount += amount;
        deposits[msg.sender][token].shares += shares;
        market.totalDeposits += amount;
        
        // 转入代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // 记录抵押品
        if (!hasCollateral(msg.sender, token)) {
            userCollaterals[msg.sender].push(token);
        }
        
        emit Deposit(msg.sender, token, amount);
    }
    
    /**
     * @notice 借款
     */
    function borrow(address token, uint256 amount) external nonReentrant {
        require(markets[token].isListed, "Market not listed");
        require(amount > 0, "Amount must be > 0");
        
        // 更新利率
        accrueInterest(token);
        
        Market storage market = markets[token];
        
        // 检查流动性
        require(
            market.totalDeposits >= market.totalBorrows + amount,
            "Insufficient liquidity"
        );
        
        // 检查借款能力
        require(
            canBorrow(msg.sender, token, amount),
            "Insufficient collateral"
        );
        
        // 更新借款
        UserBorrow storage userBorrow = borrows[msg.sender][token];
        if (userBorrow.principal > 0) {
            // 累计之前的利息
            uint256 interest = calculateBorrowInterest(msg.sender, token);
            userBorrow.principal += interest;
        }
        
        userBorrow.principal += amount;
        userBorrow.borrowIndex = market.borrowIndex;
        market.totalBorrows += amount;
        
        // 转出代币
        IERC20(token).safeTransfer(msg.sender, amount);
        
        // 记录借款
        if (!hasBorrow(msg.sender, token)) {
            userBorrows[msg.sender].push(token);
        }
        
        emit Borrow(msg.sender, token, amount);
    }
    
    /**
     * @notice 还款
     */
    function repay(address token, uint256 amount) external nonReentrant {
        require(markets[token].isListed, "Market not listed");
        
        // 更新利率
        accrueInterest(token);
        
        UserBorrow storage userBorrow = borrows[msg.sender][token];
        require(userBorrow.principal > 0, "No borrow");
        
        // 计算总欠款（本金 + 利息）
        uint256 totalDebt = getBorrowBalance(msg.sender, token);
        uint256 repayAmount = amount > totalDebt ? totalDebt : amount;
        
        // 更新状态
        if (repayAmount == totalDebt) {
            delete borrows[msg.sender][token];
        } else {
            userBorrow.principal = totalDebt - repayAmount;
            userBorrow.borrowIndex = markets[token].borrowIndex;
        }
        
        markets[token].totalBorrows -= repayAmount;
        
        // 转入代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        emit Repay(msg.sender, token, repayAmount);
    }
    
    /**
     * @notice 清算
     */
    function liquidate(
        address borrower,
        address borrowToken,
        address collateralToken,
        uint256 repayAmount
    ) external nonReentrant {
        require(markets[borrowToken].isListed, "Borrow market not listed");
        require(markets[collateralToken].isListed, "Collateral market not listed");
        
        // 更新利率
        accrueInterest(borrowToken);
        accrueInterest(collateralToken);
        
        // 检查是否可清算
        require(isLiquidatable(borrower), "Cannot liquidate");
        
        // 计算清算金额
        uint256 borrowBalance = getBorrowBalance(borrower, borrowToken);
        uint256 maxClose = (borrowBalance * CLOSE_FACTOR) / 10000;
        require(repayAmount <= maxClose, "Too much repay");
        
        // 计算抵押品数量
        uint256 seizeAmount = calculateSeizeAmount(
            borrowToken,
            collateralToken,
            repayAmount
        );
        
        // 检查抵押品充足
        require(
            deposits[borrower][collateralToken].amount >= seizeAmount,
            "Insufficient collateral"
        );
        
        // 执行清算
        // 1. 还款
        borrows[borrower][borrowToken].principal -= repayAmount;
        markets[borrowToken].totalBorrows -= repayAmount;
        IERC20(borrowToken).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // 2. 转移抵押品
        deposits[borrower][collateralToken].amount -= seizeAmount;
        deposits[msg.sender][collateralToken].amount += seizeAmount;
        
        emit Liquidate(
            msg.sender,
            borrower,
            collateralToken,
            borrowToken,
            repayAmount,
            seizeAmount
        );
    }
    
    // ========== 利率计算 ==========
    
    /**
     * @notice 累计利息
     */
    function accrueInterest(address token) public {
        Market storage market = markets[token];
        
        uint256 currentTime = block.timestamp;
        uint256 deltaTime = currentTime - market.lastUpdateTime;
        
        if (deltaTime == 0) return;
        
        uint256 borrowRate = getBorrowRate(token);
        uint256 interestFactor = (borrowRate * deltaTime) / 365 days;
        uint256 interestAccumulated = (market.totalBorrows * interestFactor) / 1e18;
        
        market.totalBorrows += interestAccumulated;
        market.borrowIndex += (market.borrowIndex * interestFactor) / 1e18;
        market.lastUpdateTime = currentTime;
    }
    
    /**
     * @notice 计算借款利率
     */
    function getBorrowRate(address token) public view returns (uint256) {
        Market memory market = markets[token];
        
        if (market.totalDeposits == 0) return market.rateModel.baseRate;
        
        uint256 utilizationRate = (market.totalBorrows * 1e18) / market.totalDeposits;
        
        if (utilizationRate <= market.rateModel.kink) {
            // 线性部分
            return market.rateModel.baseRate + 
                   (utilizationRate * market.rateModel.multiplier) / 1e18;
        } else {
            // 跳跃部分
            uint256 normalRate = market.rateModel.baseRate + 
                                (market.rateModel.kink * market.rateModel.multiplier) / 1e18;
            uint256 excessUtil = utilizationRate - market.rateModel.kink;
            return normalRate + (excessUtil * market.rateModel.jumpMultiplier) / 1e18;
        }
    }
    
    /**
     * @notice 计算存款利率
     */
    function getSupplyRate(address token) public view returns (uint256) {
        Market memory market = markets[token];
        
        if (market.totalDeposits == 0) return 0;
        
        uint256 borrowRate = getBorrowRate(token);
        uint256 utilizationRate = (market.totalBorrows * 1e18) / market.totalDeposits;
        uint256 rateToPool = (borrowRate * 9000) / 10000; // 90% 给存款人，10% 协议收入
        
        return (rateToPool * utilizationRate) / 1e18;
    }
    
    // ========== 查询函数 ==========
    
    /**
     * @notice 获取借款余额（含利息）
     */
    function getBorrowBalance(address user, address token) public view returns (uint256) {
        UserBorrow memory userBorrow = borrows[user][token];
        if (userBorrow.principal == 0) return 0;
        
        Market memory market = markets[token];
        uint256 currentIndex = market.borrowIndex;
        
        // 计算未累计的利息
        uint256 deltaTime = block.timestamp - market.lastUpdateTime;
        if (deltaTime > 0) {
            uint256 borrowRate = getBorrowRate(token);
            uint256 interestFactor = (borrowRate * deltaTime) / 365 days;
            currentIndex += (currentIndex * interestFactor) / 1e18;
        }
        
        return (userBorrow.principal * currentIndex) / userBorrow.borrowIndex;
    }
    
    /**
     * @notice 计算账户健康度
     */
    function getAccountHealth(address user) public view returns (uint256) {
        uint256 totalCollateralValue = 0;
        uint256 totalBorrowValue = 0;
        
        // 计算抵押品价值
        address[] memory collaterals = userCollaterals[user];
        for (uint256 i = 0; i < collaterals.length; i++) {
            address token = collaterals[i];
            uint256 amount = deposits[user][token].amount;
            uint256 price = getPrice(token);
            uint256 collateralFactor = markets[token].collateralFactor;
            
            totalCollateralValue += (amount * price * collateralFactor) / (1e18 * 10000);
        }
        
        // 计算借款价值
        address[] memory borrowTokens = userBorrows[user];
        for (uint256 i = 0; i < borrowTokens.length; i++) {
            address token = borrowTokens[i];
            uint256 amount = getBorrowBalance(user, token);
            uint256 price = getPrice(token);
            
            totalBorrowValue += (amount * price) / 1e18;
        }
        
        if (totalBorrowValue == 0) return type(uint256).max;
        
        return (totalCollateralValue * 1e18) / totalBorrowValue;
    }
    
    /**
     * @notice 检查是否可清算
     */
    function isLiquidatable(address user) public view returns (bool) {
        uint256 health = getAccountHealth(user);
        return health < 1e18; // 健康度 < 100%
    }
    
    /**
     * @notice 检查是否可以借款
     */
    function canBorrow(address user, address token, uint256 amount) public view returns (bool) {
        uint256 price = getPrice(token);
        uint256 borrowValue = (amount * price) / 1e18;
        
        uint256 totalCollateralValue = 0;
        uint256 totalBorrowValue = borrowValue;
        
        // 计算现有抵押和借款
        address[] memory collaterals = userCollaterals[user];
        for (uint256 i = 0; i < collaterals.length; i++) {
            address collToken = collaterals[i];
            uint256 collAmount = deposits[user][collToken].amount;
            uint256 collPrice = getPrice(collToken);
            uint256 collateralFactor = markets[collToken].collateralFactor;
            
            totalCollateralValue += (collAmount * collPrice * collateralFactor) / (1e18 * 10000);
        }
        
        address[] memory borrowTokens = userBorrows[user];
        for (uint256 i = 0; i < borrowTokens.length; i++) {
            address borrowToken = borrowTokens[i];
            uint256 borrowAmount = getBorrowBalance(user, borrowToken);
            uint256 borrowPrice = getPrice(borrowToken);
            
            totalBorrowValue += (borrowAmount * borrowPrice) / 1e18;
        }
        
        return totalCollateralValue >= totalBorrowValue;
    }
    
    // ========== 辅助函数 ==========
    
    function calculateBorrowInterest(address user, address token) internal view returns (uint256) {
        UserBorrow memory userBorrow = borrows[user][token];
        Market memory market = markets[token];
        
        return (userBorrow.principal * market.borrowIndex) / userBorrow.borrowIndex - userBorrow.principal;
    }
    
    function calculateSeizeAmount(
        address borrowToken,
        address collateralToken,
        uint256 repayAmount
    ) internal view returns (uint256) {
        uint256 borrowPrice = getPrice(borrowToken);
        uint256 collateralPrice = getPrice(collateralToken);
        
        uint256 valueRepaid = (repayAmount * borrowPrice) / 1e18;
        uint256 valueSeized = (valueRepaid * LIQUIDATION_INCENTIVE) / 10000;
        
        return (valueSeized * 1e18) / collateralPrice;
    }
    
    function getPrice(address token) internal view returns (uint256) {
        // 调用预言机获取价格
        // 这里简化处理，实际应该调用 Chainlink 等预言机
        return IPriceOracle(priceOracle).getPrice(token);
    }
    
    function getTotalShares(address token) internal view returns (uint256) {
        // 简化处理，实际应该维护总份额
        return markets[token].totalDeposits;
    }
    
    function hasCollateral(address user, address token) internal view returns (bool) {
        address[] memory collaterals = userCollaterals[user];
        for (uint256 i = 0; i < collaterals.length; i++) {
            if (collaterals[i] == token) return true;
        }
        return false;
    }
    
    function hasBorrow(address user, address token) internal view returns (bool) {
        address[] memory borrowTokens = userBorrows[user];
        for (uint256 i = 0; i < borrowTokens.length; i++) {
            if (borrowTokens[i] == token) return true;
        }
        return false;
    }
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}
```

## 🔐 安全考虑

### 1. 重入攻击防护
```solidity
// ✅ 使用 ReentrancyGuard
function withdraw() external nonReentrant {
    // ...
}

// ✅ Checks-Effects-Interactions 模式
function borrow() external {
    // 1. Checks
    require(canBorrow(), "...");
    
    // 2. Effects
    updateState();
    
    // 3. Interactions
    token.transfer(msg.sender, amount);
}
```

### 2. 预言机操纵
```solidity
// ✅ 使用多个预言机
// ✅ 时间加权平均价格（TWAP）
// ✅ 价格偏差检查
function getPrice(address token) internal view returns (uint256) {
    uint256 price1 = oracle1.getPrice(token);
    uint256 price2 = oracle2.getPrice(token);
    
    require(
        abs(price1 - price2) * 100 / price1 < 5,
        "Price deviation too high"
    );
    
    return (price1 + price2) / 2;
}
```

### 3. 闪电贷攻击
```solidity
// ✅ 价格操纵保护
// ✅ 单笔交易限额
// ✅ 时间锁
```

## 📊 Gas 优化

### 1. 批量操作
```solidity
function batchDeposit(address[] calldata tokens, uint256[] calldata amounts) external {
    for (uint256 i = 0; i < tokens.length; i++) {
        _deposit(tokens[i], amounts[i]);
    }
}
```

### 2. 存储优化
```solidity
// ❌ 多次读取存储
function bad() external {
    uint256 a = storageVar; // SLOAD
    uint256 b = storageVar; // SLOAD
    uint256 c = storageVar; // SLOAD
}

// ✅ 缓存到内存
function good() external {
    uint256 cached = storageVar; // SLOAD once
    uint256 a = cached;
    uint256 b = cached;
    uint256 c = cached;
}
```

## 🎯 实战练习

1. **添加闪电贷功能**
2. **实现多资产抵押**
3. **优化 Gas 消耗**
4. **添加治理功能**
5. **集成 Chainlink 预言机**

## 🚀 下一课预告

**第10课：智能合约安全**
- 常见漏洞和攻击
- 安全审计清单
- 形式化验证
- 模糊测试

---

💡 **记住**：DeFi 协议的核心是风险管理，安全永远是第一位！
