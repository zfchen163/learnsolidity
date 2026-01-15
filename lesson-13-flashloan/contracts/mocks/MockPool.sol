// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// 模拟代币
contract MockToken is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

/**
 * @title MockPool
 * @notice 模拟 Aave 资金池，用于本地测试闪电贷
 */
contract MockPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external {
        // 1. 转钱给借款人
        uint256 bal = IERC20(asset).balanceOf(address(this));
        require(bal >= amount, "Not enough liquidity");
        
        IERC20(asset).transfer(receiverAddress, amount);
        
        // 2. 计算利息 (0.09%)
        uint256 premium = (amount * 9) / 10000;
        
        // 3. 调用回调函数
        require(
            IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
                asset,
                amount,
                premium,
                msg.sender,
                params
            ),
            "Callback failed"
        );
        
        // 4. 收回本金 + 利息
        uint256 amountOwed = amount + premium;
        IERC20(asset).transferFrom(receiverAddress, address(this), amountOwed);
    }
}
