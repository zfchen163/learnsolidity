// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 定义 Aave 的回调接口
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// 定义 Aave 资金池接口
interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/**
 * @title MyFlashLoan
 * @notice 简单的闪电贷接收合约
 */
contract MyFlashLoan is IFlashLoanSimpleReceiver {
    IPool public POOL;

    constructor(address _pool) {
        POOL = IPool(_pool);
    }

    /**
     * @notice Aave 会调用这个函数
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // 1. 此时合约里已经有了借来的钱 (amount)
        
        // 模拟逻辑：打印日志
        // (在实际链上无法打印，这里主要为了说明流程)
        
        // 2. 算上利息
        uint256 amountOwed = amount + premium;
        
        // 3. 批准 Aave 把钱拿回去
        IERC20(asset).approve(address(POOL), amountOwed);
        
        return true;
    }

    /**
     * @notice 发起闪电贷
     */
    function requestFlashLoan(address _token, uint256 _amount) public {
        POOL.flashLoanSimple(
            address(this),
            _token,
            _amount,
            "",
            0
        );
    }
}
