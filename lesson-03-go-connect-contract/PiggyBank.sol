// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PiggyBank - 存钱罐智能合约
 * @notice 这是第3课用的合约，和第2课一样
 */
contract PiggyBank {
    address public owner;
    uint256 public depositCount;
    
    event Deposited(address indexed depositor, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed owner, uint256 amount);
    
    constructor() {
        owner = msg.sender;
        depositCount = 0;
    }
    
    function deposit() public payable {
        require(msg.value > 0, "存款金额必须大于0");
        depositCount++;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
    
    function withdraw() public {
        require(msg.sender == owner, "只有主人可以取钱");
        require(address(this).balance > 0, "存钱罐是空的");
        
        uint256 amount = address(this).balance;
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "转账失败");
        
        emit Withdrawn(owner, amount);
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    function isOwner(address _address) public view returns (bool) {
        return _address == owner;
    }
    
    function getDepositCount() public view returns (uint256) {
        return depositCount;
    }
    
    receive() external payable {
        depositCount++;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
    
    fallback() external payable {
        depositCount++;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
}
