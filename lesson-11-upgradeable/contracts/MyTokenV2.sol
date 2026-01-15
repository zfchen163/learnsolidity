// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyTokenV1.sol";

// V2 版本：增加了 mint 功能
contract MyTokenV2 is MyTokenV1 {
    // 新增的函数
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
