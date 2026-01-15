// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract MyVoteToken is ERC20Votes {
    constructor() ERC20("DaoToken", "DTK") ERC20Permit("DaoToken") {
        _mint(msg.sender, 1000 * 10**18);
    }

    // 重写必要的函数
    function _update(address from, address to, uint256 value) internal override(ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
