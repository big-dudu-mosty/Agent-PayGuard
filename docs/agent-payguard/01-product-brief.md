# 01. 产品定位

## 项目定义

Agent PayGuard 是一个面向 AI Agent 的链上支付风控基础设施。它由三部分组成：给 Agent 开发者接入的 SDK/package、给资产 Owner 管理规则的 Web 控制台，以及部署在 Mantle 上负责强制执行规则的 `PolicyVault` 合约。

Owner 把资金放在 `PolicyVault` 中，Agent runtime 通过 SDK 发起支付或后续 DeFi action。每次执行前，合约会检查 Agent 身份、单笔限额、每日限额、收款地址白名单、Action 类型和暂停状态。

简单说：

> 用户可以授权 Agent 做事，但 Agent 不能直接拿走用户私钥，也不能无限制转走资金。

## 它是什么

- 一个链上 Policy Vault。
- 一个 Agent 支付 SDK / 执行入口。
- 一个 Owner 资金权限控制台。
- 一个可审计的 Agent 行为记录层。
- 一个适合扩展到 Agent DeFi / Agent Wallet / Agent Payment 的基础模块。

## 它不是什么

- 不是完整钱包产品。
- 不是多签。
- 不是完整 Account Abstraction 账户体系。
- 不是高频交易 Bot。
- 不是 DeFi 聚合器。
- 不是发币项目。
- 不是靠聊天界面包装的普通 Chatbot。
- 不是让人每天手动付款的钱包 App。

## 真实使用方式

| 使用者 | 使用方式 | 他们得到什么 |
| --- | --- | --- |
| Agent 开发者 / Agent 平台 | 安装 PayGuard SDK，配置 Vault 地址、Agent 钱包和 RPC，在 Agent workflow 中调用 `executePayment` | 一个可复用的链上支付 guardrail |
| Owner / 资产管理员 | 打开 Web 控制台，连接钱包，设置 Agent、限额、白名单、Action、暂停/撤销 | 一个管理 Agent 花钱权限的控制台 |
| AI Agent runtime | 在后台通过 SDK 发起付款，不接触 Owner 私钥 | 可以自动执行真实链上支付 |
| Viewer / Auditor | 打开 Receipt 页面或 Mantle Explorer | 验证 Agent action 是否按规则运行 |

当前 MVP 中，`agent/src/pay.ts` 是 SDK 化之前的 CLI Demo wrapper。它的价值是让评委看到“独立 Agent 钱包在调用链上受控接口”；但长期产品不应该要求用户手敲 CLI。

## 解决谁的问题

| 角色 | 当前问题 | Agent PayGuard 解决方式 |
| --- | --- | --- |
| 个人用户 | 想让 Agent 自动付款，但不敢给私钥或无限授权 | 用户只把有限资金放进 Vault，并设置链上规则 |
| DAO / 团队 | 运营 Agent 需要支付 API、服务商、任务费用，但权限难控 | Agent 只可向白名单地址、在预算内付款 |
| Agent 开发者 | Agent 能调用工具，但缺少安全的链上资金执行层 | 通过 PolicyVault 提供标准支付执行接口 |
| 审计者 / 评委 | Agent 行为很难验证 | 成功执行都有事件和 Explorer 记录 |
| Mantle 生态项目 | 想让 Agent 带来真实链上操作，而不是聊天 Demo | PayGuard 把 Agent action 变成可验证交易 |

## 核心用户

MVP 阶段的核心用户不是普通大众，而是：

1. Agent 开发者 / Agent 平台：需要一个可插拔的 payment guardrail。
2. Web3 builder：想把 AI Agent 接到链上支付。
3. DAO / 小团队 / 个人 Owner：需要一个可理解的预算、白名单和审计控制台。
4. 黑客松评委：需要看到 Agent 的真实链上动作和安全边界。

## 用户为什么需要它

AI Agent 在金融场景里面临一个核心矛盾：

- 不给权限，Agent 只能建议，不能执行。
- 给太多权限，Agent 一旦出错或被 prompt injection，就可能造成资产损失。

Agent PayGuard 的价值是把「全权信任 Agent」变成「可度量、可撤销、可审计的有限授权」。

## AI Agent 为什么需要它

Agent 如果要进入真实经济活动，必须具备三种能力：

1. 支付能力：能支付服务费、订阅费、任务赏金、DeFi gas 或协议费用。
2. 权限边界：知道自己能做什么，不能做什么。
3. 可验证记录：外部用户能审计它是否按规则运行。

Agent PayGuard 让 Agent 不需要保管用户私钥，而是通过 SDK 调用一个链上受控接口完成资金动作。

## Mantle 为什么适合它

| Mantle 特点 | 对 Agent PayGuard 的意义 |
| --- | --- |
| EVM 兼容 | Solidity 合约和现有 Web3 工具可以快速迁移 |
| Mantle Sepolia | 黑客松部署与演示成本低 |
| 原生 MNT | 适合直接演示 Agent 小额支付 |
| 低 Gas | Agent 未来会高频执行小额动作，低成本是关键 |
| 链上事件 | Agent 行为可被前端和 Explorer 审计 |
| mETH / DeFi 生态 | 后续可扩展 Agent DeFi、收益管理、支付结算 |
| Agentic Economy 赛道 | 主题高度契合：Agent 可执行，但受控 |

## 和常见产品的区别

### 和普通钱包不同

普通钱包默认由人手动签名。Agent PayGuard 的目标是让 Agent 在后台通过 SDK 自主发起交易，但交易必须通过链上规则检查；人主要使用控制台做授权、限额、暂停和审计。

### 和多签不同

多签解决多人审批。Agent PayGuard 解决 Agent 自动执行时的「机器权限边界」。

### 和 AA 钱包不同

AA 钱包重构账户体验。Agent PayGuard MVP 不重做账户体系，而是做一个独立、可插拔的资金策略层。后续可以接 AA，但不依赖 AA。

### 和 DeFi Bot 不同

DeFi Bot 通常关注策略收益。Agent PayGuard 关注执行安全、权限控制和审计。MVP 只演示支付，不追求交易收益。

## 黑客松 Demo 最该突出的亮点

Demo 不应该只展示「Agent 可以付款」，而要展示 SDK + 控制台 + 链上规则三者的关系：

1. Owner 在控制台配置 Agent 的权限。
2. Agent 通过独立钱包 / CLI Demo 模拟 SDK 调用。
3. Agent 在规则内可以成功付款。
4. Agent 超过限额会失败。
5. Agent 向非白名单地址付款会失败。
6. 失败不是 bug，而是安全能力。
7. 所有成功执行都能在 Receipt 页面和 Mantle Explorer 中看到。

核心话术：

> Agent 被授权，但不会失控。

## Pitch Deck 首页文案

Agent PayGuard 是 AI Agent 的链上支付风控层：Agent 开发者接入 SDK，Owner 用控制台设置限额、白名单和暂停规则，Mantle 上的 PolicyVault 执行最终检查。Agent 能花钱，但不能失控；所有成功动作都可审计。
