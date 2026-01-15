// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleDEX - 简单的去中心化交易所
 * @notice 这是一个教学用的简化版 AMM DEX
 * @dev 实现了基本的流动性池和代币交换功能
 */
contract SimpleDEX {
    
    // 代币地址
    address public tokenA;
    address public tokenB;
    
    // 流动性池储备
    uint256 public reserveA;
    uint256 public reserveB;
    
    // LP 代币（流动性提供者代币）
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;
    
    // 手续费：0.3%（分子/分母）
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    // 事件
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityBurned);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
    
    /**
     * @notice 构造函数
     */
    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }
    
    /**
     * @notice 添加流动性
     */
    function addLiquidity(uint256 _amountA, uint256 _amountB) public returns (uint256 liquidityMinted) {
        require(_amountA > 0 && _amountB > 0, "金额必须大于0");
        
        // 从用户转入代币
        _safeTransferFrom(tokenA, msg.sender, address(this), _amountA);
        _safeTransferFrom(tokenB, msg.sender, address(this), _amountB);
        
        // 计算 LP 代币数量
        if (totalLiquidity == 0) {
            // 第一次添加流动性
            liquidityMinted = _sqrt(_amountA * _amountB);
        } else {
            // 后续添加流动性，按比例计算
            uint256 liquidityA = (_amountA * totalLiquidity) / reserveA;
            uint256 liquidityB = (_amountB * totalLiquidity) / reserveB;
            liquidityMinted = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidityMinted > 0, "流动性为0");
        
        // 更新状态
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        reserveA += _amountA;
        reserveB += _amountB;
        
        emit LiquidityAdded(msg.sender, _amountA, _amountB, liquidityMinted);
        return liquidityMinted;
    }
    
    /**
     * @notice 移除流动性
     */
    function removeLiquidity(uint256 _liquidity) public returns (uint256 amountA, uint256 amountB) {
        require(_liquidity > 0, "流动性必须大于0");
        require(liquidity[msg.sender] >= _liquidity, "流动性不足");
        
        // 计算可以取回的代币数量
        amountA = (_liquidity * reserveA) / totalLiquidity;
        amountB = (_liquidity * reserveB) / totalLiquidity;
        
        require(amountA > 0 && amountB > 0, "金额为0");
        
        // 更新状态
        liquidity[msg.sender] -= _liquidity;
        totalLiquidity -= _liquidity;
        reserveA -= amountA;
        reserveB -= amountB;
        
        // 转出代币
        _safeTransfer(tokenA, msg.sender, amountA);
        _safeTransfer(tokenB, msg.sender, amountB);
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, _liquidity);
        return (amountA, amountB);
    }
    
    /**
     * @notice 交换代币 A → B
     */
    function swapAforB(uint256 _amountAIn) public returns (uint256 amountBOut) {
        require(_amountAIn > 0, "输入金额必须大于0");
        
        // 计算输出金额（扣除手续费）
        amountBOut = _getAmountOut(_amountAIn, reserveA, reserveB);
        require(amountBOut > 0, "输出金额为0");
        require(amountBOut < reserveB, "流动性不足");
        
        // 转入代币 A
        _safeTransferFrom(tokenA, msg.sender, address(this), _amountAIn);
        
        // 转出代币 B
        _safeTransfer(tokenB, msg.sender, amountBOut);
        
        // 更新储备
        reserveA += _amountAIn;
        reserveB -= amountBOut;
        
        emit Swap(msg.sender, tokenA, _amountAIn, tokenB, amountBOut);
        return amountBOut;
    }
    
    /**
     * @notice 交换代币 B → A
     */
    function swapBforA(uint256 _amountBIn) public returns (uint256 amountAOut) {
        require(_amountBIn > 0, "输入金额必须大于0");
        
        // 计算输出金额（扣除手续费）
        amountAOut = _getAmountOut(_amountBIn, reserveB, reserveA);
        require(amountAOut > 0, "输出金额为0");
        require(amountAOut < reserveA, "流动性不足");
        
        // 转入代币 B
        _safeTransferFrom(tokenB, msg.sender, address(this), _amountBIn);
        
        // 转出代币 A
        _safeTransfer(tokenA, msg.sender, amountAOut);
        
        // 更新储备
        reserveB += _amountBIn;
        reserveA -= amountAOut;
        
        emit Swap(msg.sender, tokenB, _amountBIn, tokenA, amountAOut);
        return amountAOut;
    }
    
    /**
     * @notice 获取价格（A 的价格，以 B 计价）
     */
    function getPrice() public view returns (uint256) {
        require(reserveA > 0, "流动性为0");
        return (reserveB * 1e18) / reserveA;
    }
    
    /**
     * @notice 计算输出金额（AMM 公式）
     * @dev 使用恒定乘积公式：x * y = k
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) private pure returns (uint256) {
        require(amountIn > 0, "输入金额为0");
        require(reserveIn > 0 && reserveOut > 0, "储备为0");
        
        // 扣除手续费
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        
        // AMM 公式：amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @notice 平方根（用于计算初始流动性）
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    /**
     * @notice 安全转账（调用 ERC20 的 transfer）
     */
    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "转账失败");
    }
    
    /**
     * @notice 安全转账（调用 ERC20 的 transferFrom）
     */
    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "转账失败");
    }
}
