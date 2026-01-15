// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleNFT - 简单的 NFT 合约
 * @notice 这是一个教学用的简化版 ERC721
 */
contract SimpleNFT {
    
    // NFT 名称和符号
    string public name = "我的NFT";
    string public symbol = "MNFT";
    
    // NFT 总数
    uint256 public totalSupply;
    
    // tokenId → owner
    mapping(uint256 => address) public ownerOf;
    
    // owner → NFT 数量
    mapping(address => uint256) public balanceOf;
    
    // tokenId → 授权的地址
    mapping(uint256 => address) public getApproved;
    
    // owner → operator → 是否授权所有NFT
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    
    // tokenId → metadata URI
    mapping(uint256 => string) public tokenURI;
    
    // 事件
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    /**
     * @notice 铸造 NFT
     */
    function mint(address _to, string memory _tokenURI) public returns (uint256) {
        require(_to != address(0), "不能铸造给零地址");
        
        uint256 tokenId = totalSupply;
        totalSupply++;
        
        ownerOf[tokenId] = _to;
        balanceOf[_to]++;
        tokenURI[tokenId] = _tokenURI;
        
        emit Transfer(address(0), _to, tokenId);
        return tokenId;
    }
    
    /**
     * @notice 转移 NFT
     */
    function transferFrom(address _from, address _to, uint256 _tokenId) public {
        require(_from == ownerOf[_tokenId], "不是NFT的主人");
        require(_to != address(0), "不能转给零地址");
        require(
            msg.sender == _from || 
            msg.sender == getApproved[_tokenId] || 
            isApprovedForAll[_from][msg.sender],
            "没有权限"
        );
        
        // 清除授权
        delete getApproved[_tokenId];
        
        // 更新余额
        balanceOf[_from]--;
        balanceOf[_to]++;
        
        // 转移所有权
        ownerOf[_tokenId] = _to;
        
        emit Transfer(_from, _to, _tokenId);
    }
    
    /**
     * @notice 授权单个 NFT
     */
    function approve(address _approved, uint256 _tokenId) public {
        address owner = ownerOf[_tokenId];
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "没有权限");
        
        getApproved[_tokenId] = _approved;
        emit Approval(owner, _approved, _tokenId);
    }
    
    /**
     * @notice 授权所有 NFT
     */
    function setApprovalForAll(address _operator, bool _approved) public {
        isApprovedForAll[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }
}
