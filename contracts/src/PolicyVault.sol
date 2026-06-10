// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title PolicyVault
/// @notice A guarded native MNT vault that lets one authorized AI agent execute
/// payments only within owner-defined limits and recipient policy.
contract PolicyVault {
    enum ActionType {
        PAYMENT,
        DEFI_CALL
    }

    struct Policy {
        address owner;
        address agent;
        uint256 maxPerTx;
        uint256 dailyLimit;
        bool paused;
        bool revoked;
    }

    struct DailyUsage {
        uint256 day;
        uint256 spent;
    }

    Policy private _policy;
    DailyUsage private _dailyUsage;
    bool private _entered;

    mapping(address recipient => bool allowed) public whitelistedRecipients;
    mapping(uint8 actionType => bool allowed) public allowedActions;

    event VaultFunded(address indexed from, uint256 amount);
    event PolicyUpdated(address indexed owner, address indexed agent, uint256 maxPerTx, uint256 dailyLimit);
    event WhitelistUpdated(address indexed recipient, bool allowed);
    event ActionUpdated(uint8 indexed actionType, bool allowed);
    event AgentPaused(bool paused);
    event AgentRevoked(address indexed agent);
    event OwnerWithdrawal(address indexed to, uint256 amount);
    event PaymentExecuted(
        address indexed agent,
        address indexed to,
        uint256 amount,
        uint256 day,
        uint256 dailySpentAfter,
        string memo
    );

    error NotOwner();
    error NotAgent();
    error AgentPausedError();
    error AgentRevokedError();
    error ActionNotAllowed();
    error RecipientNotWhitelisted();
    error ExceedsMaxPerTx();
    error ExceedsDailyLimit();
    error TransferFailed();
    error InvalidConfig();
    error Reentrancy();
    error InsufficientBalance();

    modifier onlyOwner() {
        if (msg.sender != _policy.owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != _policy.agent) revert NotAgent();
        _;
    }

    modifier nonReentrant() {
        if (_entered) revert Reentrancy();
        _entered = true;
        _;
        _entered = false;
    }

    constructor(address agent_, uint256 maxPerTx_, uint256 dailyLimit_) payable {
        _validateLimits(maxPerTx_, dailyLimit_);
        if (agent_ == address(0)) revert InvalidConfig();

        _policy = Policy({
            owner: msg.sender,
            agent: agent_,
            maxPerTx: maxPerTx_,
            dailyLimit: dailyLimit_,
            paused: false,
            revoked: false
        });

        allowedActions[uint8(ActionType.PAYMENT)] = true;

        emit PolicyUpdated(msg.sender, agent_, maxPerTx_, dailyLimit_);

        if (msg.value > 0) {
            emit VaultFunded(msg.sender, msg.value);
        }
    }

    receive() external payable {
        emit VaultFunded(msg.sender, msg.value);
    }

    function setAgent(address agent_) external onlyOwner {
        if (agent_ == address(0)) revert InvalidConfig();

        _policy.agent = agent_;
        _policy.revoked = false;

        emit PolicyUpdated(_policy.owner, agent_, _policy.maxPerTx, _policy.dailyLimit);
    }

    function setLimits(uint256 maxPerTx_, uint256 dailyLimit_) external onlyOwner {
        _validateLimits(maxPerTx_, dailyLimit_);

        _policy.maxPerTx = maxPerTx_;
        _policy.dailyLimit = dailyLimit_;

        emit PolicyUpdated(_policy.owner, _policy.agent, maxPerTx_, dailyLimit_);
    }

    function setWhitelist(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert InvalidConfig();

        whitelistedRecipients[recipient] = allowed;
        emit WhitelistUpdated(recipient, allowed);
    }

    function setAllowedAction(uint8 actionType, bool allowed) external onlyOwner {
        allowedActions[actionType] = allowed;
        emit ActionUpdated(actionType, allowed);
    }

    function pauseAgent(bool paused) external onlyOwner {
        _policy.paused = paused;
        emit AgentPaused(paused);
    }

    function revokeAgent() external onlyOwner {
        _policy.revoked = true;
        emit AgentRevoked(_policy.agent);
    }

    /// @notice Owner can always withdraw vault funds. Agent limits do not apply:
    /// policy constrains the agent, the owner remains the ultimate controller.
    function ownerWithdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidConfig();
        if (amount == 0 || amount > address(this).balance) revert InsufficientBalance();

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit OwnerWithdrawal(to, amount);
    }

    function executePayment(address payable to, uint256 amount, string calldata memo)
        external
        onlyAgent
        nonReentrant
    {
        _checkPayment(to, amount);
        _rollDailyWindowIfNeeded();

        _dailyUsage.spent += amount;

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PaymentExecuted(msg.sender, to, amount, _dailyUsage.day, _dailyUsage.spent, memo);
    }

    /// @notice Policy precheck for an explicit caller. Decouples identity from
    /// `msg.sender` so frontends can simulate the agent without account overrides.
    function isAllowedFor(address caller, address to, uint256 amount)
        public
        view
        returns (bool allowed, string memory reason)
    {
        if (caller != _policy.agent) return (false, "NOT_AGENT");
        if (_policy.paused) return (false, "PAUSED");
        if (_policy.revoked) return (false, "REVOKED");
        if (!allowedActions[uint8(ActionType.PAYMENT)]) return (false, "ACTION_DISABLED");
        if (!whitelistedRecipients[to]) return (false, "NOT_WHITELISTED");
        if (amount > _policy.maxPerTx) return (false, "EXCEEDS_PER_TX");

        uint256 currentDay = _currentDay();
        uint256 spent = _dailyUsage.day == currentDay ? _dailyUsage.spent : 0;
        if (spent + amount > _policy.dailyLimit) return (false, "EXCEEDS_DAILY");

        return (true, "OK");
    }

    /// @notice Backward-compatible precheck judged against `msg.sender`.
    function isAllowed(address to, uint256 amount) external view returns (bool allowed, string memory reason) {
        return isAllowedFor(msg.sender, to, amount);
    }

    function getPolicy() external view returns (Policy memory) {
        return _policy;
    }

    function getDailySpent() external view returns (uint256 day, uint256 spent) {
        uint256 currentDay = _currentDay();
        if (_dailyUsage.day != currentDay) {
            return (currentDay, 0);
        }

        return (_dailyUsage.day, _dailyUsage.spent);
    }

    function owner() external view returns (address) {
        return _policy.owner;
    }

    function agent() external view returns (address) {
        return _policy.agent;
    }

    function _checkPayment(address to, uint256 amount) internal view {
        if (_policy.paused) revert AgentPausedError();
        if (_policy.revoked) revert AgentRevokedError();
        if (!allowedActions[uint8(ActionType.PAYMENT)]) revert ActionNotAllowed();
        if (!whitelistedRecipients[to]) revert RecipientNotWhitelisted();
        if (amount > _policy.maxPerTx) revert ExceedsMaxPerTx();

        uint256 currentDay = _currentDay();
        uint256 spent = _dailyUsage.day == currentDay ? _dailyUsage.spent : 0;
        if (spent + amount > _policy.dailyLimit) revert ExceedsDailyLimit();
    }

    function _rollDailyWindowIfNeeded() internal {
        uint256 currentDay = _currentDay();
        if (_dailyUsage.day != currentDay) {
            _dailyUsage.day = currentDay;
            _dailyUsage.spent = 0;
        }
    }

    function _validateLimits(uint256 maxPerTx_, uint256 dailyLimit_) internal pure {
        if (maxPerTx_ == 0 || dailyLimit_ < maxPerTx_) revert InvalidConfig();
    }

    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }
}

