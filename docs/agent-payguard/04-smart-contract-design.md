# 04. 智能合约设计

> 2026-06-10 更新：v1.1 合约变更（`ownerWithdraw`、`isAllowedFor`）已实现、测试（24 用例全绿）并部署到 Mantle Sepolia `0xD87aDfa5E4b9d42c543233500464bE08369810CA`。设计见文末「v1.1 合约变更」章节。

## 合约设计结论

MVP 推荐只实现一个核心合约：

- `PolicyVault.sol`

暂时不做：

- `PayGuardFactory.sol`
- 多 Vault registry
- 多 Agent 权限矩阵
- 插件式 DeFi adapter
- Account Abstraction 账户体系

原因：黑客松第一目标是 Demo 稳定。一个可测试、可部署、可审计的单 Vault 合约比复杂合约组更容易拿到完整度分。

## 合约职责

`PolicyVault.sol` 负责：

1. 接收并持有原生 MNT。
2. 保存 Owner 和 Agent 地址。
3. 保存单笔限额。
4. 保存每日限额。
5. 保存收款地址白名单。
6. 保存允许 Action 类型。
7. 允许 Agent 发起支付。
8. 在支付前执行链上 policy check。
9. 规则通过后转账。
10. 规则不通过时 revert。
11. 发出可查询事件。
12. 提供 policy 状态查询。

## 是否需要 Factory

| 选项 | 优点 | 缺点 | MVP 建议 |
| --- | --- | --- | --- |
| 不做 Factory，前端直接部署 `PolicyVault` | 简单、测试面小、部署快 | 多用户管理弱 | 推荐 |
| 做 `PayGuardFactory` | 可管理多个 Vault，前端创建更像产品 | 多一个合约、多一组事件、多一组测试 | 1-2 周再做 |

MVP 可以在前端提供「Create Vault」按钮，底层直接部署 `PolicyVault`。这样视觉上仍然是创建 Vault，不需要 Factory。

## 核心数据结构

### ActionType

```solidity
enum ActionType {
    PAYMENT,
    DEFI_CALL
}
```

字段说明：

| 值 | 含义 | MVP 使用 |
| --- | --- | --- |
| `PAYMENT` | 原生 MNT 支付 | 是 |
| `DEFI_CALL` | 调用 DeFi 协议或 adapter | 否，保留扩展 |

### Policy

```solidity
struct Policy {
    address owner;
    address agent;
    uint256 maxPerTx;
    uint256 dailyLimit;
    bool paused;
    bool revoked;
}
```

字段说明：

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| `owner` | Vault 管理者 | Alice 钱包 |
| `agent` | 被授权执行的 Agent 地址 | Agent 测试钱包 |
| `maxPerTx` | 单笔最大支付金额，单位 wei | `1 ether` 表示 1 MNT |
| `dailyLimit` | 每日最大累计支付金额 | `10 ether` |
| `paused` | 临时暂停 Agent | true 后无法支付 |
| `revoked` | 撤销 Agent 授权 | true 后无法支付 |

### DailyUsage

```solidity
struct DailyUsage {
    uint256 day;
    uint256 spent;
}
```

字段说明：

| 字段 | 含义 |
| --- | --- |
| `day` | 当前自然日编号，使用 `block.timestamp / 1 days` |
| `spent` | 当天已花费金额 |

### Whitelist

```solidity
mapping(address => bool) public whitelistedRecipients;
```

用于限制 Agent 只能向白名单地址付款。

### Allowed Actions

```solidity
mapping(uint8 => bool) public allowedActions;
```

用于限制 Agent 可以执行哪些类型的 action。MVP 默认只开启 `PAYMENT`。

## 事件设计

| 事件 | 用途 | MVP 必须 |
| --- | --- | --- |
| `VaultFunded(address from, uint256 amount)` | Vault 收到 MNT | 是 |
| `PolicyUpdated(address owner, address agent, uint256 maxPerTx, uint256 dailyLimit)` | 策略变更 | 是 |
| `WhitelistUpdated(address recipient, bool allowed)` | 白名单变更 | 是 |
| `ActionUpdated(uint8 actionType, bool allowed)` | Action 开关变更 | 是 |
| `AgentPaused(bool paused)` | 暂停状态变更 | 是 |
| `AgentRevoked(address agent)` | Agent 被撤销 | 是 |
| `PaymentExecuted(address agent, address to, uint256 amount, uint256 day, uint256 dailySpentAfter, string memo)` | 支付成功记录 | 是 |

失败记录不做链上事件，因为 revert 会回滚事件。MVP 中由前端或 Agent SDK / CLI Demo 捕获失败原因。

## 错误设计

使用 custom error，便于测试和前端解析：

```solidity
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
```

## 关键函数表

| 函数名 | 调用者 | 作用 | 核心检查 | MVP 必须 |
| --- | --- | --- | --- | --- |
| `constructor(address agent, uint256 maxPerTx, uint256 dailyLimit)` | Owner | 初始化 Vault | agent 非零、limit 合理 | 是 |
| `receive()` | Anyone | 接收 MNT | 无 | 是 |
| `setAgent(address agent)` | Owner | 修改 Agent 地址 | onlyOwner、非零地址 | 是 |
| `setLimits(uint256 maxPerTx, uint256 dailyLimit)` | Owner | 修改限额 | onlyOwner、daily >= maxPerTx | 是 |
| `setWhitelist(address recipient, bool allowed)` | Owner | 修改白名单 | onlyOwner | 是 |
| `setAllowedAction(uint8 actionType, bool allowed)` | Owner | 修改 Action 权限 | onlyOwner | 是 |
| `pauseAgent(bool paused)` | Owner | 暂停或恢复 Agent | onlyOwner | 是 |
| `revokeAgent()` | Owner | 撤销 Agent | onlyOwner | 是 |
| `executePayment(address payable to, uint256 amount, string memo)` | Agent | 执行 MNT 支付 | onlyAgent、policy check | 是 |
| `isAllowed(address to, uint256 amount)` | Anyone | 预检查支付是否可执行（按 `msg.sender` 判定身份） | 只读检查 | 是 |
| `isAllowedFor(address caller, address to, uint256 amount)` | Anyone | 预检查指定调用者的支付是否可执行（v1.1） | 只读检查 | 是（v1.1） |
| `ownerWithdraw(address payable to, uint256 amount)` | Owner | Owner 取回 Vault 资金（v1.1） | onlyOwner、nonReentrant | 是（v1.1） |
| `getPolicy()` | Anyone | 读取策略 | 无 | 是 |
| `getDailySpent()` | Anyone | 读取今日已花费 | 自动按天返回 | 是 |
| `executeDeFiAction(...)` | Agent | DeFi 动作 | 更复杂检查 | 否 |

## Policy 规则设计

| Policy | 作用 | 示例 | MVP 必须 | Demo 展示方式 |
| --- | --- | --- | --- | --- |
| Agent 地址授权 | 只有 Agent 能调用执行函数 | `agent = 0xAgent` | 是 | 非 Agent 调用失败 |
| 单笔最大金额 | 限制单次损失 | 每笔最多 1 MNT | 是 | 2 MNT 失败 |
| 每日最大金额 | 限制累计损失 | 每天最多 10 MNT | 是 | 累计超额失败 |
| 收款地址白名单 | 限制资金流向 | 只允许 `0xRecipient` | 是 | 非白名单失败 |
| Action 类型 | 限制 Agent 能力范围 | 只允许 `PAYMENT` | 是 | 后续可展示 DeFi 关闭 |
| 暂停 | 临时停用 Agent | `paused = true` | 是 | 暂停后失败 |
| 撤销 | 停止授权 | `revoked = true` | 是 | 撤销后失败 |

## 每日限额计算

MVP 使用：

```solidity
uint256 currentDay = block.timestamp / 1 days;
```

如果 `dailyUsage.day != currentDay`，说明进入新的一天，重置 `spent = 0`。

### 使用 `block.timestamp` 是否可以

可以。原因：

1. MVP 不涉及高精度金融结算。
2. 每日限额是粗粒度预算控制。
3. L2 sequencer 对 timestamp 有一定控制空间，但在黑客松支付限额场景可接受。
4. 不做复杂 rolling window 可以显著降低 bug 风险。

### 是否需要 nonce / 防重放

MVP 不需要自定义 nonce，因为：

1. Agent 直接发链上交易。
2. 交易由 Agent 钱包签名。
3. EOA 自身 nonce 已经防止同一笔交易重复上链。

只有做离线签名授权或 meta-transaction 时，才需要自定义 nonce。

## 不能忽略的安全点

MVP 不能忽略：

- `onlyOwner`
- `onlyAgent`
- 白名单
- 限额
- 暂停 / 撤销
- 余额不足时的失败处理
- 转账失败处理
- 测试覆盖失败路径

MVP 可以简化：

- 不做多 Agent。
- 不做 role-based access control。
- 不做复杂时间窗口。
- 不做离线签名。
- 不做 EIP-712。
- 不做 AA。

## Solidity 伪代码

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

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

    Policy public policy;
    DailyUsage public dailyUsage;

    mapping(address => bool) public whitelistedRecipients;
    mapping(uint8 => bool) public allowedActions;

    event VaultFunded(address indexed from, uint256 amount);
    event PolicyUpdated(address indexed owner, address indexed agent, uint256 maxPerTx, uint256 dailyLimit);
    event WhitelistUpdated(address indexed recipient, bool allowed);
    event ActionUpdated(uint8 indexed actionType, bool allowed);
    event AgentPaused(bool paused);
    event AgentRevoked(address indexed agent);
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

    modifier onlyOwner() {
        if (msg.sender != policy.owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != policy.agent) revert NotAgent();
        _;
    }

    constructor(address agent_, uint256 maxPerTx_, uint256 dailyLimit_) payable {
        if (agent_ == address(0)) revert InvalidConfig();
        if (maxPerTx_ == 0) revert InvalidConfig();
        if (dailyLimit_ < maxPerTx_) revert InvalidConfig();

        policy = Policy({
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
        policy.agent = agent_;
        policy.revoked = false;
        emit PolicyUpdated(policy.owner, agent_, policy.maxPerTx, policy.dailyLimit);
    }

    function setLimits(uint256 maxPerTx_, uint256 dailyLimit_) external onlyOwner {
        if (maxPerTx_ == 0) revert InvalidConfig();
        if (dailyLimit_ < maxPerTx_) revert InvalidConfig();

        policy.maxPerTx = maxPerTx_;
        policy.dailyLimit = dailyLimit_;

        emit PolicyUpdated(policy.owner, policy.agent, maxPerTx_, dailyLimit_);
    }

    function setWhitelist(address recipient, bool allowed) external onlyOwner {
        whitelistedRecipients[recipient] = allowed;
        emit WhitelistUpdated(recipient, allowed);
    }

    function setAllowedAction(uint8 actionType, bool allowed) external onlyOwner {
        allowedActions[actionType] = allowed;
        emit ActionUpdated(actionType, allowed);
    }

    function pauseAgent(bool paused) external onlyOwner {
        policy.paused = paused;
        emit AgentPaused(paused);
    }

    function revokeAgent() external onlyOwner {
        policy.revoked = true;
        emit AgentRevoked(policy.agent);
    }

    function executePayment(address payable to, uint256 amount, string calldata memo)
        external
        onlyAgent
    {
        _checkPayment(to, amount);
        _rollDailyWindowIfNeeded();

        dailyUsage.spent += amount;

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit PaymentExecuted(
            msg.sender,
            to,
            amount,
            dailyUsage.day,
            dailyUsage.spent,
            memo
        );
    }

    function isAllowed(address to, uint256 amount)
        external
        view
        returns (bool allowed, string memory reason)
    {
        if (msg.sender != policy.agent) return (false, "NOT_AGENT");
        if (policy.paused) return (false, "PAUSED");
        if (policy.revoked) return (false, "REVOKED");
        if (!allowedActions[uint8(ActionType.PAYMENT)]) return (false, "ACTION_DISABLED");
        if (!whitelistedRecipients[to]) return (false, "NOT_WHITELISTED");
        if (amount > policy.maxPerTx) return (false, "EXCEEDS_PER_TX");

        uint256 currentDay = block.timestamp / 1 days;
        uint256 spent = dailyUsage.day == currentDay ? dailyUsage.spent : 0;
        if (spent + amount > policy.dailyLimit) return (false, "EXCEEDS_DAILY");

        return (true, "OK");
    }

    function getPolicy() external view returns (Policy memory) {
        return policy;
    }

    function getDailySpent() external view returns (uint256 day, uint256 spent) {
        uint256 currentDay = block.timestamp / 1 days;
        if (dailyUsage.day != currentDay) {
            return (currentDay, 0);
        }
        return (dailyUsage.day, dailyUsage.spent);
    }

    function _checkPayment(address to, uint256 amount) internal view {
        if (policy.paused) revert AgentPausedError();
        if (policy.revoked) revert AgentRevokedError();
        if (!allowedActions[uint8(ActionType.PAYMENT)]) revert ActionNotAllowed();
        if (!whitelistedRecipients[to]) revert RecipientNotWhitelisted();
        if (amount > policy.maxPerTx) revert ExceedsMaxPerTx();

        uint256 currentDay = block.timestamp / 1 days;
        uint256 spent = dailyUsage.day == currentDay ? dailyUsage.spent : 0;
        if (spent + amount > policy.dailyLimit) revert ExceedsDailyLimit();
    }

    function _rollDailyWindowIfNeeded() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (dailyUsage.day != currentDay) {
            dailyUsage.day = currentDay;
            dailyUsage.spent = 0;
        }
    }
}
```

## 实现时的细节建议

1. 如果使用 OpenZeppelin，可以加 `ReentrancyGuard`，但 MVP 为减少依赖也可以先不加。
2. `executePayment` 先更新 `dailyUsage.spent` 再转账，如果转账失败会整体 revert。
3. Demo 收款地址建议用普通 EOA，不要用未知合约地址，避免 fallback 导致转账失败。
4. 测试中要覆盖 `receive()` 收款。
5. 前端金额统一用 `parseEther` 和 `formatEther`，不要手写 decimals。

## v1.1 合约变更（2026-06-10 黑客松冲刺）

> 背景见 [09-hackathon-alignment.md](./09-hackathon-alignment.md) R5。两项变更，均需重新部署并更新 `deployments/mantle-sepolia.json`、ABI、前端与 agent 配置。

### 变更 1：`ownerWithdraw`

**解决的问题**：v1.0 中资金唯一出口是 Agent 的 `executePayment`。Agent 私钥丢失或被撤销后，Owner 的资金永久锁死，与「Owner 始终控制资产」的产品叙事矛盾。

```solidity
event OwnerWithdrawal(address indexed to, uint256 amount);
error InsufficientBalance();

function ownerWithdraw(address payable to, uint256 amount)
    external
    onlyOwner
    nonReentrant
{
    if (to == address(0)) revert InvalidConfig();
    if (amount == 0 || amount > address(this).balance) revert InsufficientBalance();

    (bool ok,) = to.call{value: amount}("");
    if (!ok) revert TransferFailed();

    emit OwnerWithdrawal(to, amount);
}
```

设计要点：

- Owner 提款**不受** Agent 的限额、白名单约束。这是特性：限额约束的是 Agent 这台「机器」，Owner 是最终控制人。Pitch 中主动讲清楚。
- 不影响 `dailyUsage`：Owner 提款不计入 Agent 每日花费。
- 发出独立事件 `OwnerWithdrawal`，Receipt 页可选展示。

### 变更 2：`isAllowedFor`

**解决的问题**：v1.0 的 `isAllowed` 用 `msg.sender` 判定身份。前端 Simulator 由 Owner 钱包发起 `eth_call`，永远返回 `NOT_AGENT`，预检查功能对控制台不可用（CLI 侧靠 viem 的 `account` override 绕过了这个问题）。

```solidity
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

/// @notice 向后兼容包装，行为与 v1.0 一致。
function isAllowed(address to, uint256 amount)
    external
    view
    returns (bool allowed, string memory reason)
{
    return isAllowedFor(msg.sender, to, amount);
}
```

设计要点：

- 身份与策略检查解耦：前端 Simulator 直接传入 agent 地址做预检查，无需 account override。
- `isAllowed` 保留，CLI / SDK 既有调用不破坏。

### v1.1 测试增量

| 测试场景 | 预期结果 |
| --- | --- |
| Owner 提款成功 | 余额减少，`OwnerWithdrawal` 事件发出 |
| 非 Owner 提款 | revert `NotOwner` |
| 提款金额超余额 / 为 0 | revert `InsufficientBalance` |
| 提款到零地址 | revert `InvalidConfig` |
| Agent 被撤销后 Owner 仍可提款 | 成功（资金不锁死） |
| `isAllowedFor` 传入非 agent 地址 | 返回 `(false, "NOT_AGENT")` |
| `isAllowedFor` 传入 agent 地址、规则内 | 返回 `(true, "OK")` |
| `isAllowed` 与 `isAllowedFor(msg.sender)` 等价 | 行为一致 |

### 部署与迁移

1. v1.0 地址 `0xF98c...96B3` 标记为历史版本，文档不再作为当前地址引用。
2. 部署 v1.1 后更新：`deployments/mantle-sepolia.json`（唯一真源）、`agent/src/abi.ts`、前端 ABI 与默认地址、`agent/.env`。
3. 重新执行充值、白名单配置，并补做 [09 文档](./09-hackathon-alignment.md) R6 的链上 revert 证据交易。
