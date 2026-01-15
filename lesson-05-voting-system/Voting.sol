// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Voting - 简单投票系统
 * @notice 一人一票的投票系统
 */
contract Voting {
    
    // 候选人结构体
    struct Candidate {
        uint id;           // 候选人ID
        string name;       // 候选人名字
        uint voteCount;    // 得票数
    }
    
    // 状态变量
    address public owner;                          // 管理员
    Candidate[] public candidates;                 // 候选人数组
    mapping(address => bool) public hasVoted;      // 记录是否已投票
    mapping(address => uint) public voterChoice;   // 记录投给了谁
    uint public totalVotes;                        // 总投票数
    
    // 事件
    event CandidateAdded(uint id, string name);
    event Voted(address indexed voter, uint candidateId);
    
    // 修饰符：只有管理员
    modifier onlyOwner() {
        require(msg.sender == owner, "只有管理员可以操作");
        _;
    }
    
    // 构造函数
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice 添加候选人（只有管理员）
     */
    function addCandidate(string memory _name) public onlyOwner {
        uint candidateId = candidates.length;
        candidates.push(Candidate({
            id: candidateId,
            name: _name,
            voteCount: 0
        }));
        
        emit CandidateAdded(candidateId, _name);
    }
    
    /**
     * @notice 投票
     */
    function vote(uint _candidateId) public {
        // 检查1：还没投过票
        require(!hasVoted[msg.sender], "你已经投过票了");
        
        // 检查2：候选人存在
        require(_candidateId < candidates.length, "候选人不存在");
        
        // 记录投票
        hasVoted[msg.sender] = true;
        voterChoice[msg.sender] = _candidateId;
        
        // 增加候选人票数
        candidates[_candidateId].voteCount++;
        totalVotes++;
        
        emit Voted(msg.sender, _candidateId);
    }
    
    /**
     * @notice 获取候选人数量
     */
    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }
    
    /**
     * @notice 获取候选人信息
     */
    function getCandidate(uint _candidateId) public view returns (uint, string memory, uint) {
        require(_candidateId < candidates.length, "候选人不存在");
        Candidate memory c = candidates[_candidateId];
        return (c.id, c.name, c.voteCount);
    }
    
    /**
     * @notice 获取获胜者
     */
    function getWinner() public view returns (uint winnerId, string memory winnerName, uint winnerVotes) {
        require(candidates.length > 0, "还没有候选人");
        
        uint winningVoteCount = 0;
        uint winningCandidateId = 0;
        
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[i].voteCount;
                winningCandidateId = i;
            }
        }
        
        return (
            winningCandidateId,
            candidates[winningCandidateId].name,
            winningVoteCount
        );
    }
}
