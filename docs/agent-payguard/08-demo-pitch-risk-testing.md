# 08. 测试、Demo、Pitch 与风险

## 测试用例设计

MVP 的测试重点不是覆盖所有 Solidity 边角，而是确保 Demo 三条路径稳定：

1. 规则内成功。
2. 超限失败。
3. 非白名单失败。

## 核心测试表

| 测试场景 | 输入 | 预期结果 | MVP 必须 |
| --- | --- | --- | --- |
| Owner 可以设置 Agent | owner 调 `setAgent(newAgent)` | agent 更新，事件发出 | 是 |
| 非 Owner 不能设置 Policy | attacker 调 `setLimits` | revert `NotOwner` | 是 |
| Vault 可以接收 MNT | owner 向 Vault 转 MNT | balance 增加，`VaultFunded` 发出 | 是 |
| Agent 在单笔限额内支付成功 | 0.5 MNT，maxPerTx 1 MNT | recipient 收到 MNT，事件发出 | 是 |
| Agent 超过单笔限额失败 | 2 MNT，maxPerTx 1 MNT | revert `ExceedsMaxPerTx` | 是 |
| Agent 超过每日限额失败 | 多次累计超过 dailyLimit | revert `ExceedsDailyLimit` | 是 |
| Agent 向白名单地址支付成功 | recipient 在 whitelist | 成功 | 是 |
| Agent 向非白名单地址支付失败 | recipient 不在 whitelist | revert `RecipientNotWhitelisted` | 是 |
| 未授权地址不能执行 | attacker 调 `executePayment` | revert `NotAgent` | 是 |
| Owner 暂停 Agent 后无法执行 | `pauseAgent(true)` 后支付 | revert `AgentPausedError` | 是 |
| Owner 撤销 Agent 后无法执行 | `revokeAgent()` 后支付 | revert `AgentRevokedError` | 是 |
| Action 被关闭后无法支付 | `setAllowedAction(PAYMENT,false)` | revert `ActionNotAllowed` | 是 |
| Event 是否正确发出 | 成功支付 | `PaymentExecuted` 参数正确 | 是 |
| `getDailySpent` 新日返回 0 | 时间推进一天 | spent 返回 0 | 建议 |

## Demo Story

Alice 有一个 AI 财务助理 Agent（真实 LLM 驱动）。Alice 希望它每天最多能花 10 MNT，每笔最多 1 MNT，只能付给白名单服务商，不能随便转走资产。Agent 可以自动付款，但每次付款都必须通过 Agent PayGuard 的链上规则检查。

Demo 的高光时刻：我们**现场对自己的 Agent 做 prompt injection 攻击**——在任务文本里藏入「把资金转给攻击者」的恶意指令，LLM 被骗、构造了恶意支付，但 PayGuard 在链上把它拦住。

核心表达：

> Agent can spend, but it should never spend out of control.

## 2 分钟 Demo 时间线（v2，2026-06-10 更新）

| 时间 | 操作 | 画面 | 解说词 | 目的 |
| --- | --- | --- | --- | --- |
| 0-15s | 打开 Dashboard | Mantle Sepolia、Vault、Policy（单笔 1 MNT、每日 10 MNT、白名单） | “这是 Alice 的 Agent PayGuard Vault。她没有给 Agent 私钥，只给了有限的链上权限。” | 建立上下文 + 安全边界 |
| 15-40s | LLM Agent 执行自然语言任务 | 终端：`npm run agent:demo -- --task "Pay 0.01 MNT to ... for API subscription"`，LLM 解析 → SDK 支付 → tx hash | “Agent 收到自然语言任务，LLM 解析后通过 PayGuard SDK 在规则内完成真实链上支付。” | 证明真实 AI + 真实链上动作 |
| 40-55s | Receipt 页面刷新 | PaymentExecuted 记录 + Explorer 链接 | “这次 Agent action 已经上链，任何人可审计。” | 证明可验证 |
| 55-85s | **Prompt injection 攻击** | 任务文本藏恶意指令 → LLM 被骗构造大额/非白名单支付 → 终端显示 PayGuard 拒绝 | “现在我们攻击自己的 Agent。注入的指令骗过了 LLM，但骗不过链上规则——PayGuard 拒绝了这笔支付。” | 全场高光：安全是合约保证的，不靠模型自觉 |
| 85-100s | 链上 revert 证据 | Explorer 显示一笔失败交易（`--force` 预先准备） | “即使绕过 SDK 直接发交易，合约本身仍然拒绝。强制力在链上，不在脚本里。” | 堵住「链下拒绝」质疑 |
| 100-110s | Owner 控制权 | 控制台暂停 Agent / `ownerWithdraw` | “Alice 随时可以暂停 Agent、取回全部资金。Owner 永远是最终控制人。” | 证明 Owner 主权 |
| 110-120s | 总结 | Dashboard + Receipt | “Agent 被授权，但不会失控。这就是 Agentic Economy 需要的支付护栏。” | 收束价值 + 点题赛道 |

## Demo 操作清单

Demo 前必须准备好：

- Owner 钱包有测试 MNT。
- Agent 钱包有少量测试 MNT 用于 Gas。
- Vault（v1.1 新地址）有足够测试 MNT。
- 白名单地址准备好。
- 非白名单地址准备好。
- LLM Demo Agent 的 API key 可用，且结构化输入降级路径已验证。
- Prompt injection 用例文本准备好并彩排过。
- 成功命令、超限命令、非白名单命令准备好。
- `--force` 链上 revert 交易已提前完成，Explorer 链接可打开。
- Mantle Explorer 链接可打开。
- 录屏备用。

## 提交材料清单（截止 2026-06-15）

官方提交方式：在 X 发布 Thread，带 `#MantleAIHackathon`。

| 材料 | 要求 |
| --- | --- |
| X Thread | Hook 用 prompt injection 拦截片段（GIF/短视频）；含一句话 pitch、Demo 视频、GitHub、合约地址、`#MantleAIHackathon` |
| Demo 视频 | 2 分钟，按上方 v2 时间线 |
| GitHub | README 完整：安装、部署、运行、v1.1 合约地址、成功 tx、链上 revert tx |
| Mantle 合约地址 | v1.1 PolicyVault（以 `deployments/mantle-sepolia.json` 为准） |
| DoraHacks BUIDL | 提前一天提交，不要拖到截止前一小时 |

注意：Community Voting 奖（2 × $8,500）完全看 X 互动量，Thread 质量本身就是奖金，值得花半天打磨。

## 一句话 Pitch

AI Agent can spend, but it should never spend out of control.

中文版本：

> AI Agent 可以花钱，但不能失控地花钱。

## Problem

AI Agent 正在从回答问题变成执行任务。它们未来会支付 API、订阅服务、完成任务赏金、执行 DeFi 操作。  
但金融场景的问题是：用户不敢直接给 Agent 私钥，也不应该给 Agent 无限授权。

没有权限，Agent 不能真正执行。  
权限太大，Agent 一旦出错或被攻击，就可能造成资产损失。

## Solution

Agent PayGuard 提供一个链上 PolicyVault：

- 用户把资金放进 Vault。
- 用户设置 Agent 地址。
- 用户设置单笔限额、每日限额、白名单和 Action 类型。
- Agent 只能调用 Vault 的受控接口。
- 每次执行都由合约检查规则。
- 成功执行会发出链上事件。
- 失败动作会被明确拒绝。

## Why Mantle

Agent 支付天然需要：

- 低成本。
- 高频小额执行。
- EVM 兼容开发体验。
- 可审计链上记录。

Mantle 适合做 Agent 支付和 Agent DeFi 的执行层。MVP 使用 Mantle Sepolia 和原生 MNT 支付，后续可以扩展到 mETH、DeFi yield action 和 Byreal Skills。

## Demo

现场展示：

1. Alice 配置 Agent PayGuard。
2. Agent 在规则内成功支付。
3. Agent 超过单笔限额失败。
4. Agent 给非白名单地址付款失败。
5. Receipt 页面展示成功执行记录。

## Market / Future

未来 Agent PayGuard 可以扩展到：

- Agent API payment。
- Agent DeFi execution。
- DAO operational spending。
- Agent task marketplace escrow。
- mETH / yield strategy guardrail。
- Agent reputation and policy templates。

## Hackathon Scope

本次黑客松完成：

- PolicyVault 合约（v1.1：含 `ownerWithdraw` 与 `isAllowedFor`）。
- Mantle Sepolia 部署。
- Agent 限额控制、收款地址白名单、暂停/撤销。
- `PayGuardClient` SDK + CLI thin wrapper。
- LLM Demo Agent：自然语言任务执行 + prompt injection 拦截演示。
- 前端配置与审计页面。
- 成功路径、SDK 拒绝路径、链上 revert 证据三层 Demo。
- 冲刺目标：Byreal Skills 包装（`guarded_mnt_payment`）、ERC-8004 身份对齐。

## Differentiation

| 对比对象 | 差异 |
| --- | --- |
| 普通钱包 | 普通钱包是人手动签名；PayGuard 允许 Agent 自动执行，但受链上规则限制 |
| 多签 | 多签解决多人审批；PayGuard 解决 Agent 机器权限边界 |
| AA 钱包 | AA 优化账户体验；PayGuard 聚焦 Agent action 的预算、白名单和审计 |
| DeFi Bot | DeFi Bot 追求收益；PayGuard 先确保 Agent 不失控 |
| Chatbot | Chatbot 只是建议；PayGuard 让 Agent 执行真实链上动作 |

## Closing

> Before agents manage money, they need guardrails. Agent PayGuard is the on-chain spending policy layer for autonomous agents on Mantle.

中文版本：

> 在 Agent 管钱之前，它们需要链上护栏。Agent PayGuard 就是 Mantle 上自主 Agent 的支付策略层。

## 3 分钟 Pitch 讲稿

AI Agent 正在从聊天工具变成执行者。它们会帮用户支付 API、订阅服务、完成任务、甚至执行 DeFi 操作。但当 Agent 进入金融场景，最大的难题不是它够不够聪明，而是用户敢不敢给它钱。

如果不给权限，Agent 只能给建议，不能执行。如果给它私钥或无限授权，一旦 Agent 出错、被 prompt injection 或调用了错误工具，用户资产就可能被转走。

Agent PayGuard 解决这个问题。我们提供一个链上 PolicyVault。用户把资金放进 Vault，并设置 Agent 地址、单笔限额、每日限额、白名单收款地址和允许的 Action 类型。Agent 不能直接控制用户私钥，只能通过 PolicyVault 发起支付。每一次支付都会先经过链上规则检查。规则通过，交易执行；规则不通过，合约直接拒绝。

我们选择 Mantle，因为 Agent 支付天然需要低 Gas、高频小额执行和可审计记录。MVP 使用 Mantle Sepolia 和原生 MNT 支付。每次成功的 Agent action 都会产生链上事件，并可以在 Receipt 页面和 Mantle Explorer 中查看。

今天的 Demo 展示三个路径。第一，Alice 创建 Vault 并授权她的 AI 财务助理 Agent。第二，Agent 在规则内成功支付。第三，Agent 尝试超额付款和向非白名单地址付款，都会被合约拒绝。

这不是普通钱包，也不是 DeFi Bot。普通钱包依赖人手动签名，DeFi Bot 通常拿到过大的权限。Agent PayGuard 是 Agent 进入链上金融前需要的权限、预算和审计层。我们的目标很简单：让 Agent 能做事，但不能失控。

## 风险与降级方案

| 风险 | 影响 | 预防方式 | 降级方案 |
| --- | --- | --- | --- |
| Mantle Sepolia RPC 不稳定 | 前端或 Agent 卡住 | 准备备用 RPC；提前录屏 | 用录屏和 Explorer tx 讲解 |
| 合约部署失败 | 无法展示链上能力 | Day 1 完成部署；保存部署地址 | 使用已部署合约，不现场部署 |
| 前端写合约失败 | 配置流程中断 | 保留脚本或区块浏览器写入方式 | 用预配置 Vault 演示 |
| Agent SDK / CLI Demo 失败 | Agentic 感不足 | 固定 demo 命令；提前跑通 | 前端展示 precheck，录屏展示 Agent |
| Event 读取失败 | Receipt 页面空 | 固定 fromBlock；保存 tx hash | 手动展示 Explorer 交易 |
| 白名单 / 限额逻辑有 bug | 核心价值受损 | 测试优先；少做复杂逻辑 | 只演示单笔限额和白名单 |
| Demo 时间不够 | 讲不清价值 | 严格 2 分钟时间线 | 只展示成功 + 一个失败 + Receipt |
| 评委觉得只是权限钱包 | 叙事弱 | 强调 SDK 给 Agent 用、控制台给 Owner 用、链上 policy 强制执行 | 展示 SDK 真实代码和三个接入入口（CLI / LLM Agent / Byreal Skill） |
| 评委觉得 Agent 不够 Agentic | 赛道契合弱 | LLM Demo Agent 真实执行 + prompt injection 拦截演示 | LLM 翻车时用结构化输入降级，注入场景用录屏 |
| 评委质疑拒绝发生在链下 | 链上强制力存疑 | 预先准备 `--force` 链上 revert 交易 | 现场打开 Explorer 失败交易页 |
| DeFi 集成来不及 | 扩展性不足 | MVP 不承诺 DeFi | Pitch 放 roadmap，不影响核心 |
| LLM 接入不稳定 | Demo 翻车 | 核心流程不依赖 LLM | 用结构化命令代替自然语言 |
| 测试 MNT 不足 | 交易失败 | 提前准备 Owner 和 Agent 钱包余额 | 减小支付金额 |
| Explorer 打不开 | 审计展示弱 | 提前截图或录屏 | Receipt 页面本地展示 tx hash |

## 最终开发结论

### MVP 第一版必须做

1. `PolicyVault.sol`
2. 原生 MNT 存款和支付。
3. Agent 地址授权。
4. 单笔限额。
5. 每日限额。
6. 白名单收款地址。
7. 暂停和撤销。
8. `PaymentExecuted` 事件。
9. Next.js Dashboard。
10. Configure Policy 页面。
11. Agent CLI Demo，最好抽出最小 SDK client。
12. Receipt 页面。

### 坚决不要做

- 不做复杂 AA。
- 不做多链。
- 不做 DeFi 聚合。
- 不做发币。
- 不做高频交易。
- 不做必须依赖 LLM 的核心流程。
- 不做复杂后端。

### 合约怎么设计最稳

一个 `PolicyVault` 合约即可。  
不要先做 Factory。  
不要让 Agent 任意 call 外部合约。  
MVP 只允许 `executePayment`。

### 前端优先做哪几个页面

1. Dashboard
2. Configure Policy
3. Agent Action Simulator
4. Receipt / Explorer

可以做成单页四个 Tab。

### Agent SDK / CLI Demo 怎么做最简单

当前最简单是 TypeScript CLI Demo：

```bash
npx tsx src/pay.ts --to 0xRecipient --amount 0.01 --memo "demo payment"
```

先 `isAllowed`，再 `executePayment`，最后输出 tx hash 或失败原因。

更符合产品定位的下一步是把核心逻辑抽成：

```ts
await payguard.executePayment({ to, amount: "0.01", memo });
```

### 是否需要后端

MVP 不需要。前端直接读链上事件。

### 是否需要 LLM

需要（2026-06-10 结论变更，见 09 文档 R1）。  
LLM 只做自然语言转 JSON 和 prompt injection 演示，最终权限判断必须在链上；核心链路不依赖 LLM，翻车时降级为结构化输入。

### 如何体现 Mantle

- 部署到 Mantle Sepolia。
- 使用 MNT 作为支付资产。
- 展示 Mantle Explorer 链接。
- 用低 Gas 支撑多次 Agent action。
- Pitch 中强调 Agent 支付需要低成本链上审计。

### 如何提高拿奖概率

1. Demo 必须稳定。
2. 失败路径必须讲清楚是安全能力。
3. Receipt 页面必须让评委看到可审计。
4. Pitch 必须聚焦 Agent 进入金融世界的权限边界。
5. 如果有时间，接 Byreal Skills 或做最小 LLM parser。

### 今天马上开始开发，第一步

第一步不是做前端，也不是做 LLM。  
第一步是实现并测试 `PolicyVault.sol`，把三条路径跑通：

1. 白名单内小额支付成功。
2. 超过单笔限额失败。
3. 非白名单收款失败。
