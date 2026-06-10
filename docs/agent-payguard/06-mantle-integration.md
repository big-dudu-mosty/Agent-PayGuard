# 06. Mantle 集成点

## 集成目标

Agent PayGuard 不能只是「部署到某条 EVM 链」。它需要把 Mantle 的特点自然变成产品价值：

1. Agent 小额支付适合低 Gas 环境。
2. MNT 可以作为原生支付资产和 Gas 资产。
3. Agent 多次执行会产生链上事件，Mantle Explorer 可审计。
4. 后续可以扩展到 mETH、DeFi、收益资产和 Byreal Skills。

## Mantle Sepolia

MVP 部署在 Mantle Sepolia。

| 项 | 值 |
| --- | --- |
| Network | Mantle Sepolia |
| Chain ID | `5003` |
| RPC | `https://rpc.sepolia.mantle.xyz` |
| Explorer | `https://sepolia.mantlescan.xyz` |
| Native token | MNT |

## 集成点表

| Mantle 结合点 | MVP 是否使用 | 如何展示 | Pitch 里怎么讲 |
| --- | --- | --- | --- |
| Mantle Sepolia 部署 | 是 | 合约地址和 Explorer 链接 | 不是概念，是真实部署在 Mantle 测试网 |
| MNT 作为 Gas | 是 | Agent 钱包用 MNT 支付 Gas | Agent action 需要低成本执行环境 |
| MNT 作为支付资产 | 是 | Vault 原生 MNT 转账 | 先从最小支付闭环开始 |
| 低 Gas | 是 | 多次支付和失败尝试 | Agent 经济需要频繁小额交易 |
| 链上事件审计 | 是 | Receipt 页面读取事件 | 每次 Agent 成功动作都有链上证据 |
| 多步执行 | 部分 | policy check + payment | 未来可扩展为多步 DeFi action |
| Mantle DeFi / mETH | 进阶 | Roadmap 展示 | PayGuard 可保护 Agent 收益操作 |
| Byreal Skills | **冲刺必做（允许降级）** | `guarded_mnt_payment` skill 包装 | Track 06 描述点名 Byreal Skills CLI，评委席有 Byreal 成员 |
| ERC-8004 Agent 身份 | **冲刺建议（pitch 必须覆盖）** | Demo Agent 注册身份，Receipt 页展示 | 本届赛事三大招牌特性之一，直接对应 Ecosystem Fit |

## MVP 如何体现 Mantle

Demo 中必须出现以下元素：

1. 前端网络显示 Mantle Sepolia。
2. Vault 地址链接到 Mantle Sepolia Explorer。
3. 支付资产显示为 MNT。
4. Agent 交易 hash 链接到 Mantle Sepolia Explorer。
5. Receipt 页面展示 Mantle 链上事件。

## 当前部署记录

> 部署地址唯一真源是 [`deployments/mantle-sepolia.json`](../../deployments/mantle-sepolia.json)。

| 项 | 值 |
| --- | --- |
| Network | Mantle Sepolia（Chain ID `5003`） |
| PolicyVault v1.1（当前，含 `ownerWithdraw` / `isAllowedFor`） | [`0xD87aDfa5E4b9d42c543233500464bE08369810CA`](https://sepolia.mantlescan.xyz/address/0xD87aDfa5E4b9d42c543233500464bE08369810CA) |
| v1.1 SDK 成功支付 | [0x67fc...c51a](https://sepolia.mantlescan.xyz/tx/0x67fc9116866a7ca29f8c4b95b8ef9d449f8a88a951533849690958088efdc51a) |
| v1.1 LLM Agent 成功支付 | [0x3c95...2444](https://sepolia.mantlescan.xyz/tx/0x3c9563288f77503205bce3d565bbbc35cc18ee94d1db60ef37bb2225ebdd2444) |
| 链上 revert 证据（ExceedsMaxPerTx） | [0x6293...3cbe](https://sepolia.mantlescan.xyz/tx/0x62934c1e4d156b94ec31ee0d8aaee154a011e45a97bc3b22e90a9a1074923cbe) |
| 链上 revert 证据（RecipientNotWhitelisted） | [0x07aa...5a06](https://sepolia.mantlescan.xyz/tx/0x07aa11208884285eb7c6e93e0b36990e33887fb30511a4670b04fde957555a06) |
| PolicyVault v1.0（历史） | `0xF98cf6aBF2cB7456A707e05bFee7568Cb8a096B3` |

强制力的双层证据已齐：SDK precheck 在链下拒绝（省 gas），`--force` 绕过 SDK 后合约本身仍然 revert（上方两笔失败交易，链上可查）。

## Demo 话术

可以这样讲：

> Agent 的支付动作通常是高频、小额、自动化的。Mantle 的低 Gas 和 EVM 兼容让我们可以把每次 Agent action 都放到链上检查和记录，而不是把安全逻辑藏在中心化后端。

## mETH / DeFi 扩展

MVP 只做 MNT 支付。进阶版本可以加入：

1. `DEFI_CALL` action。
2. 白名单 DeFi 协议地址。
3. `executeDeFiAction(target, value, data, memo)`。
4. 只允许预设 function selector。
5. 接入 mETH deposit / withdraw / yield action。

### DeFi Action 设计思路

不要让 Agent 任意 call 任意合约。进阶版应增加：

```solidity
mapping(address => bool) public whitelistedProtocols;
mapping(bytes4 => bool) public allowedSelectors;
```

然后检查：

- target 是否是白名单协议。
- function selector 是否被允许。
- value 是否在限额内。
- action type 是否开启。

## Byreal Skills 集成思路

**2026-06-10 已完成。** 调研结论：Byreal Agent Skills 的本质是 **OpenClaw 技能体系**——`skills/<name>/SKILL.md`（YAML frontmatter + agent 使用说明）+ 一个支持 `-o json` 结构化输出的 CLI，用 `npx skills add <repo>` 安装；Byreal 本体是 Solana 上的 CLMM DEX，与 Mantle Vault 不直接互通。

因此正确的集成方式不是调用 Byreal 的 DEX 命令，而是**把 PayGuard 按同一技能格式打包**，让任何 OpenClaw 兼容 Agent（包括运行 Byreal Skills 的 Agent）可以同时装上「受控 Mantle 支付」能力。已实现：

- `skills/payguard/SKILL.md`：技能描述、命令、凭证规范、硬约束（含「不得绕过 rejected 结果」）
- `npm run payguard -- <status|precheck|pay|catalog> [-o json]`：内部调用 `PayGuardClient`，拒绝时 exit code 2

Pitch 话术：Byreal Skills 给了 Agent 交易的手，PayGuard 给这些手戴上链上手套——同一个技能体系，互补的能力。

原始 skill 设计稿（已实现，存档）：

```text
Skill: guarded_mnt_payment
Input:
  - vaultAddress
  - recipient
  - amount
  - memo
Behavior:
  - read policy
  - run precheck
  - call executePayment
  - return tx hash or rejection reason
```

Pitch 里可讲：

> Byreal Skills 让 Agent 拥有可组合动作，Agent PayGuard 则给这些动作加上链上预算和权限护栏。

## ERC-8004 集成思路

ERC-8004 Agent 身份是本届赛事三大招牌特性之一（每个参赛 Agent 发放身份 NFT），直接对应 Grand Champion 的 Ecosystem Fit 评分。

**2026-06-10 已完成最小集成**：Demo Agent 已在 Mantle 官方部署的 ERC-8004 IdentityRegistry（Mantle Sepolia `0x8004A3718bD35CF767BC0E718bf21Ec4073502f0`）注册，获得 **Agent ID 2**（[注册 tx](https://sepolia.mantlescan.xyz/tx/0x1e55c83cdac49b875fab7b62665d84c21a6a634920e5fd7c8c730f7f248d37a1)）。注册文件以 data URI 内嵌，声明了 agent 钱包、`guarded_mnt_payment` 技能和绑定的 PolicyVault 地址。脚本：`npm run agent:register-identity`。

Pitch 层对齐：

> PolicyVault 的 agent 地址可绑定 ERC-8004 身份。未来策略可以和 Agent 声誉挂钩：信誉好的 Agent 获得更高限额，违规记录写入身份历史。PayGuard 是 ERC-8004 身份体系里「财务权限」的那一层。

不做：自建身份 / 声誉系统。

## 为什么不是强行套链

如果只是把合约部署到 Mantle，但安全逻辑在后端，那就是强行套链。  
Agent PayGuard 的核心检查在链上：

- Agent 身份在链上检查。
- 预算在链上累计。
- 白名单在链上保存。
- 成功支付在链上发生。
- 执行记录在链上事件中可查。

这就是 Mantle 在项目中的实际作用。

## 推荐提交材料中的 Mantle 信息

README 和黑客松提交中应包含：

```text
Network: Mantle Sepolia
Chain ID: 5003
PolicyVault Address: 0x...
Mantle Explorer: https://sepolia.mantlescan.xyz/address/0x...
Demo successful tx: https://sepolia.mantlescan.xyz/tx/0x...
Demo rejected actions:
  - ExceedsMaxPerTx
  - RecipientNotWhitelisted
```

## 进阶 Mantle 叙事

如果有 1-2 周时间，可以把叙事升级为：

> Mantle is the settlement layer for autonomous agent payments. Agent PayGuard makes every AI-initiated financial action budgeted, constrained, and auditable on-chain.

中文版本：

> Mantle 可以成为自主 Agent 支付和 DeFi 执行的结算层。Agent PayGuard 让每一次 AI 发起的金融动作都有预算、有边界、可审计。
