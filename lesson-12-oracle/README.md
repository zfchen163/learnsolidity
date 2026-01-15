# 第12课：预言机和链下数据 🔮

## 🎯 这一课你会学到

- 什么是预言机（Oracle）
- Chainlink 价格预言机
- Chainlink VRF（可验证随机数）
- Chainlink Automation（Keeper）
- 自定义预言机
- TWAP（时间加权平均价格）

## 🤔 预言机问题

### 区块链的局限

```
区块链世界（链上）      真实世界（链下）
┌─────────────┐         ┌─────────────┐
│ 智能合约    │   ？    │ 股票价格    │
│ DeFi 协议   │  <──>   │ 天气数据    │
│ NFT 游戏    │         │ 体育比分    │
└─────────────┘         └─────────────┘
```

**问题**：
- 智能合约无法直接访问链下数据
- 无法发起 HTTP 请求
- 无法读取真实世界的信息

**解决方案**：预言机（Oracle）

### 什么是预言机？

```
链下数据源 → 预言机节点 → 智能合约
   ↓            ↓            ↓
股票API      聚合验证      DeFi协议
天气API      签名数据      保险合约
体育API      上链         游戏合约
```

**预言机的作用**：
1. 获取链下数据
2. 验证数据真实性
3. 将数据上链
4. 提供给智能合约

---

## 🔗 Chainlink 价格预言机

### 基础用法

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceConsumer
 * @notice 获取 ETH/USD 价格
 */
contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;
    
    /**
     * Network: Ethereum Mainnet
     * Aggregator: ETH/USD
     * Address: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
     */
    constructor() {
        priceFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    }
    
    /**
     * @notice 获取最新价格
     * @return price ETH/USD 价格（8位小数）
     */
    function getLatestPrice() public view returns (int) {
        (
            /* uint80 roundID */,
            int price,
            /* uint startedAt */,
            /* uint timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        return price; // 例如：185432000000 = $1854.32
    }
    
    /**
     * @notice 获取价格（带小数处理）
     * @return price 格式化后的价格
     */
    function getPrice() public view returns (uint256) {
        (, int price, , , ) = priceFeed.latestRoundData();
        return uint256(price) / 1e8; // 转换为整数美元
    }
    
    /**
     * @notice 获取历史价格
     * @param roundId 轮次ID
     */
    function getHistoricalPrice(uint80 roundId) 
        public 
        view 
        returns (int) 
    {
        (
            /* uint80 roundID */,
            int price,
            /* uint startedAt */,
            /* uint timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.getRoundData(roundId);
        
        return price;
    }
    
    /**
     * @notice 获取价格精度
     */
    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals(); // 8
    }
    
    /**
     * @notice 获取价格描述
     */
    function getDescription() public view returns (string memory) {
        return priceFeed.description(); // "ETH / USD"
    }
}
```

### 生产级价格预言机

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceOracle - 生产级价格预言机
 * @notice 支持多个价格源，带价格验证
 */
contract PriceOracle {
    
    struct PriceFeed {
        AggregatorV3Interface feed;
        uint8 decimals;
        uint256 heartbeat;  // 最大更新间隔
        bool isActive;
    }
    
    mapping(address => PriceFeed) public priceFeeds;
    
    event PriceFeedAdded(address indexed token, address indexed feed);
    event PriceFeedRemoved(address indexed token);
    event StalePrice(address indexed token, uint256 timestamp);
    
    /**
     * @notice 添加价格源
     */
    function addPriceFeed(
        address token,
        address feed,
        uint256 heartbeat
    ) external {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        
        priceFeeds[token] = PriceFeed({
            feed: priceFeed,
            decimals: priceFeed.decimals(),
            heartbeat: heartbeat,
            isActive: true
        });
        
        emit PriceFeedAdded(token, feed);
    }
    
    /**
     * @notice 获取价格（带验证）
     */
    function getPrice(address token) public view returns (uint256) {
        PriceFeed memory priceFeed = priceFeeds[token];
        require(priceFeed.isActive, "Price feed not active");
        
        (
            uint80 roundId,
            int256 price,
            /* uint256 startedAt */,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.feed.latestRoundData();
        
        // 验证1：价格必须大于0
        require(price > 0, "Invalid price");
        
        // 验证2：轮次必须完整
        require(answeredInRound >= roundId, "Stale price");
        
        // 验证3：价格必须是最新的
        require(
            block.timestamp - updatedAt <= priceFeed.heartbeat,
            "Price too old"
        );
        
        // 标准化到 18 位小数
        return _scalePrice(uint256(price), priceFeed.decimals);
    }
    
    /**
     * @notice 获取价格（不抛出异常）
     */
    function tryGetPrice(address token) 
        public 
        view 
        returns (bool success, uint256 price) 
    {
        try this.getPrice(token) returns (uint256 p) {
            return (true, p);
        } catch {
            return (false, 0);
        }
    }
    
    /**
     * @notice 标准化价格到 18 位小数
     */
    function _scalePrice(uint256 price, uint8 decimals) 
        internal 
        pure 
        returns (uint256) 
    {
        if (decimals < 18) {
            return price * (10 ** (18 - decimals));
        } else if (decimals > 18) {
            return price / (10 ** (decimals - 18));
        }
        return price;
    }
    
    /**
     * @notice 计算两个代币的相对价格
     */
    function getRelativePrice(address tokenA, address tokenB) 
        public 
        view 
        returns (uint256) 
    {
        uint256 priceA = getPrice(tokenA);
        uint256 priceB = getPrice(tokenB);
        
        return (priceA * 1e18) / priceB;
    }
}
```

---

## 🎲 Chainlink VRF（可验证随机数）

### 为什么需要 VRF？

```solidity
// ❌ 不安全的随机数
function badRandom() public view returns (uint256) {
    // 矿工可以操纵这些值！
    return uint256(keccak256(abi.encodePacked(
        block.timestamp,
        block.difficulty,
        msg.sender
    )));
}
```

### Chainlink VRF 实现

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title RandomNumberConsumer
 * @notice 使用 Chainlink VRF 生成随机数
 */
contract RandomNumberConsumer is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    
    // VRF 配置
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    
    // 存储随机数
    mapping(uint256 => uint256) public s_randomWords;
    mapping(uint256 => address) public s_requesters;
    uint256 public s_requestId;
    
    event RandomnessRequested(uint256 indexed requestId, address requester);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomWord);
    
    /**
     * Network: Ethereum Mainnet
     * Coordinator: 0x271682DEB8C4E0901D1a1550aD2e64D568E69909
     * Key Hash: 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef
     */
    constructor(uint64 subscriptionId) 
        VRFConsumerBaseV2(0x271682DEB8C4E0901D1a1550aD2e64D568E69909) 
    {
        COORDINATOR = VRFCoordinatorV2Interface(
            0x271682DEB8C4E0901D1a1550aD2e64D568E69909
        );
        s_subscriptionId = subscriptionId;
        keyHash = 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef;
    }
    
    /**
     * @notice 请求随机数
     */
    function requestRandomWords() external returns (uint256 requestId) {
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        s_requesters[requestId] = msg.sender;
        emit RandomnessRequested(requestId, msg.sender);
        
        return requestId;
    }
    
    /**
     * @notice VRF 回调函数
     * @dev 由 Chainlink VRF 调用
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        s_randomWords[requestId] = randomWords[0];
        emit RandomnessFulfilled(requestId, randomWords[0]);
    }
    
    /**
     * @notice 获取随机数
     */
    function getRandomWord(uint256 requestId) 
        public 
        view 
        returns (uint256) 
    {
        return s_randomWords[requestId];
    }
}
```

### 实战：链上抽奖

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

/**
 * @title Lottery - 链上抽奖
 */
contract Lottery is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 200000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    
    address[] public players;
    address public winner;
    uint256 public lotteryId;
    
    mapping(uint256 => uint256) public lotteryRequestIds;
    
    event LotteryEntered(address indexed player);
    event WinnerPicked(address indexed winner, uint256 amount);
    
    constructor(uint64 subscriptionId) 
        VRFConsumerBaseV2(0x271682DEB8C4E0901D1a1550aD2e64D568E69909) 
    {
        COORDINATOR = VRFCoordinatorV2Interface(
            0x271682DEB8C4E0901D1a1550aD2e64D568E69909
        );
        s_subscriptionId = subscriptionId;
        keyHash = 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef;
    }
    
    /**
     * @notice 参与抽奖
     */
    function enter() external payable {
        require(msg.value >= 0.01 ether, "Minimum 0.01 ETH");
        players.push(msg.sender);
        emit LotteryEntered(msg.sender);
    }
    
    /**
     * @notice 开始抽奖
     */
    function pickWinner() external {
        require(players.length > 0, "No players");
        
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        lotteryRequestIds[requestId] = lotteryId;
    }
    
    /**
     * @notice VRF 回调
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % players.length;
        winner = players[indexOfWinner];
        
        uint256 prize = address(this).balance;
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Transfer failed");
        
        emit WinnerPicked(winner, prize);
        
        // 重置
        players = new address[](0);
        lotteryId++;
    }
}
```

---

## ⏰ Chainlink Automation（Keeper）

### 自动化执行

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

/**
 * @title Counter - 自动计数器
 * @notice 每分钟自动增加计数
 */
contract Counter is AutomationCompatibleInterface {
    uint256 public counter;
    uint256 public lastTimeStamp;
    uint256 public interval;
    
    constructor(uint256 updateInterval) {
        interval = updateInterval;
        lastTimeStamp = block.timestamp;
        counter = 0;
    }
    
    /**
     * @notice Chainlink Keeper 调用此函数检查是否需要执行
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }
    
    /**
     * @notice Chainlink Keeper 执行此函数
     */
    function performUpkeep(bytes calldata /* performData */) 
        external 
        override 
    {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
        }
    }
}
```

### 实战：自动复利

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

interface IVault {
    function compound() external;
    function lastCompound() external view returns (uint256);
}

/**
 * @title AutoCompounder
 * @notice 自动复利机器人
 */
contract AutoCompounder is AutomationCompatibleInterface {
    IVault public vault;
    uint256 public interval = 1 days;
    
    constructor(address _vault) {
        vault = IVault(_vault);
    }
    
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        uint256 lastCompound = vault.lastCompound();
        upkeepNeeded = (block.timestamp - lastCompound) >= interval;
    }
    
    function performUpkeep(bytes calldata /* performData */) 
        external 
        override 
    {
        vault.compound();
    }
}
```

---

## 📊 TWAP（时间加权平均价格）

### Uniswap V2 TWAP

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/lib/contracts/libraries/FixedPoint.sol";

/**
 * @title TWAPOracle
 * @notice Uniswap V2 TWAP 预言机
 */
contract TWAPOracle {
    using FixedPoint for *;
    
    IUniswapV2Pair public pair;
    address public token0;
    address public token1;
    
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint32 public blockTimestampLast;
    
    FixedPoint.uq112x112 public price0Average;
    FixedPoint.uq112x112 public price1Average;
    
    uint256 public constant PERIOD = 24 hours;
    
    constructor(address _pair) {
        pair = IUniswapV2Pair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        
        price0CumulativeLast = pair.price0CumulativeLast();
        price1CumulativeLast = pair.price1CumulativeLast();
        
        (, , blockTimestampLast) = pair.getReserves();
    }
    
    /**
     * @notice 更新 TWAP
     */
    function update() external {
        (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) = currentCumulativePrices();
        
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        require(timeElapsed >= PERIOD, "Period not elapsed");
        
        // 计算平均价格
        price0Average = FixedPoint.uq112x112(
            uint224((price0Cumulative - price0CumulativeLast) / timeElapsed)
        );
        price1Average = FixedPoint.uq112x112(
            uint224((price1Cumulative - price1CumulativeLast) / timeElapsed)
        );
        
        price0CumulativeLast = price0Cumulative;
        price1CumulativeLast = price1Cumulative;
        blockTimestampLast = blockTimestamp;
    }
    
    /**
     * @notice 获取当前累计价格
     */
    function currentCumulativePrices() 
        public 
        view 
        returns (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        ) 
    {
        blockTimestamp = uint32(block.timestamp % 2**32);
        price0Cumulative = pair.price0CumulativeLast();
        price1Cumulative = pair.price1CumulativeLast();
        
        (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast_
        ) = pair.getReserves();
        
        if (blockTimestampLast_ != blockTimestamp) {
            uint32 timeElapsed = blockTimestamp - blockTimestampLast_;
            price0Cumulative += uint256(
                FixedPoint.fraction(reserve1, reserve0)._x
            ) * timeElapsed;
            price1Cumulative += uint256(
                FixedPoint.fraction(reserve0, reserve1)._x
            ) * timeElapsed;
        }
    }
    
    /**
     * @notice 查询价格
     */
    function consult(address token, uint256 amountIn) 
        external 
        view 
        returns (uint256 amountOut) 
    {
        if (token == token0) {
            amountOut = price0Average.mul(amountIn).decode144();
        } else {
            require(token == token1, "Invalid token");
            amountOut = price1Average.mul(amountIn).decode144();
        }
    }
}
```

---

## 🎯 最佳实践

### 1. 价格验证

```solidity
// ✅ 多重验证
function getPrice(address token) public view returns (uint256) {
    // 1. 检查价格源是否活跃
    require(priceFeeds[token].isActive, "Inactive feed");
    
    // 2. 获取价格
    (, int256 price, , uint256 updatedAt, ) = 
        priceFeeds[token].feed.latestRoundData();
    
    // 3. 验证价格有效性
    require(price > 0, "Invalid price");
    
    // 4. 验证价格新鲜度
    require(
        block.timestamp - updatedAt <= MAX_DELAY,
        "Stale price"
    );
    
    // 5. 验证价格范围
    require(
        price >= MIN_PRICE && price <= MAX_PRICE,
        "Price out of range"
    );
    
    return uint256(price);
}
```

### 2. 回退机制

```solidity
// ✅ 多个价格源
function getPrice(address token) public view returns (uint256) {
    // 尝试主要价格源
    (bool success, uint256 price) = tryGetPriceFromChainlink(token);
    if (success) return price;
    
    // 回退到 TWAP
    (success, price) = tryGetPriceFromTWAP(token);
    if (success) return price;
    
    // 回退到备用预言机
    (success, price) = tryGetPriceFromBackup(token);
    require(success, "All oracles failed");
    
    return price;
}
```

### 3. 价格操纵保护

```solidity
// ✅ 使用 TWAP 防止闪电贷攻击
// ✅ 设置价格变动上限
// ✅ 多个价格源交叉验证
```

---

## 🚀 下一课预告

**第13课：闪电贷和套利**
- 闪电贷原理
- Aave/Uniswap 闪电贷
- 套利策略
- MEV
- Flashbots

---

💡 **记住**：预言机是 DeFi 的眼睛，价格数据的准确性至关重要！
