// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleToken - 简单的 ERC20 代币
 * @notice 这是一个教学用的简化版 ERC20 代币
 */
contract SimpleToken {
    
    // 代币信息
    string public name = "我的代币";
    string public symbol = "MYT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    // 余额映射
    mapping(address => uint256) public balanceOf;
    
    // 授权映射：owner => spender => amount
    mapping(address => mapping(address => uint256)) public allowance;
    
    // 事件
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @notice 构造函数：创建代币
     * @param _initialSupply 初始供应量
     */
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    /**
     * @notice 转账
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "不能转给零地址");
        require(balanceOf[msg.sender] >= _value, "余额不足");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    /**
     * @notice 授权：允许 spender 花费你的代币
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    /**
     * @notice 从别人账户转账（需要授权）
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_to != address(0), "不能转给零地址");
        require(balanceOf[_from] >= _value, "余额不足");
        require(allowance[_from][msg.sender] >= _value, "授权额度不足");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
}
