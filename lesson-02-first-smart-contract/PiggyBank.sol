// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PiggyBank - 存钱罐智能合约
 * @notice 这是一个简单的存钱罐，只有主人可以取钱
 * @dev 这是教学用的简化版本
 */
contract PiggyBank {
    
    // ========== 状态变量 ==========
    // 这些变量会永久存储在区块链上
    
    address public owner;        // 主人的地址（谁创建了这个存钱罐）
    uint256 public depositCount; // 存了多少次钱（计数器）
    
    // ========== 事件 ==========
    // 事件就像日志，记录发生了什么
    // 外部程序可以监听这些事件
    
    event Deposited(address indexed depositor, uint256 amount, uint256 newBalance);
    // 存钱事件：谁存的、存了多少、现在总共有多少
    
    event Withdrawn(address indexed owner, uint256 amount);
    // 取钱事件：谁取的、取了多少
    
    // ========== 构造函数 ==========
    // 创建合约时自动执行一次
    
    constructor() {
        owner = msg.sender; // 把创建合约的人设为主人
        depositCount = 0;   // 初始化计数器
    }
    
    // ========== 函数 ==========
    
    /**
     * @notice 存钱到存钱罐
     * @dev 任何人都可以存钱，使用 payable 关键字接收以太币
     */
    function deposit() public payable {
        // require: 检查条件，不满足就回滚
        require(msg.value > 0, "存款金额必须大于0");
        
        // 增加存款计数
        depositCount++;
        
        // 触发事件（记录日志）
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
    
    /**
     * @notice 取出所有钱
     * @dev 只有主人可以取钱
     */
    function withdraw() public {
        // 检查1：只有主人可以取钱
        require(msg.sender == owner, "只有主人可以取钱");
        
        // 检查2：存钱罐里要有钱
        require(address(this).balance > 0, "存钱罐是空的");
        
        // 记录要取多少钱
        uint256 amount = address(this).balance;
        
        // 转账给主人
        // payable(owner).transfer(amount); // 旧方法，不推荐
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "转账失败");
        
        // 触发事件
        emit Withdrawn(owner, amount);
    }
    
    /**
     * @notice 查看存钱罐余额
     * @return 当前余额（单位：Wei）
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice 检查某个地址是否是主人
     * @param _address 要检查的地址
     * @return 是否是主人
     */
    function isOwner(address _address) public view returns (bool) {
        return _address == owner;
    }
    
    /**
     * @notice 获取存款次数
     * @return 总共存了多少次钱
     */
    function getDepositCount() public view returns (uint256) {
        return depositCount;
    }
    
    // ========== 接收以太币的特殊函数 ==========
    
    /**
     * @notice 当有人直接转账到合约地址时调用
     * @dev 这样也算一次存款
     */
    receive() external payable {
        depositCount++;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
    
    /**
     * @notice 当调用不存在的函数时调用
     */
    fallback() external payable {
        depositCount++;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
}

/*
=== 代码解释 ===

1. 状态变量（State Variables）
   - 存储在区块链上，永久保存
   - 每次修改都要消耗 Gas

2. 函数可见性（Visibility）
   - public: 任何人都能调用
   - private: 只有合约内部能调用
   - internal: 合约内部和子合约能调用
   - external: 只能从外部调用

3. 函数修饰符（Modifiers）
   - view: 只读，不修改状态
   - pure: 纯函数，不读也不写
   - payable: 可以接收以太币

4. 特殊变量
   - msg.sender: 调用者的地址
   - msg.value: 发送的以太币数量
   - address(this).balance: 合约的余额

5. 安全模式
   - require: 检查条件，失败就回滚
   - 先检查，再修改状态，最后转账（CEI 模式）
   - 使用 call 而不是 transfer（防止 Gas 限制问题）
*/
