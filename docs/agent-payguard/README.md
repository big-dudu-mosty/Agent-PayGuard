# Agent PayGuard 文档中心

> 项目方向：AI Agent 的链上支付风控基础设施。正式使用形态是 **SDK 给 Agent 接入 + 控制台给 Owner 管理 + Mantle 上的 PolicyVault 做最终规则执行**。

本目录只存放 Agent PayGuard 的产品、技术、Demo 和黑客松规划文档，不放合约、前端、Agent 脚本或部署产物。后续代码建议放在仓库根目录下的独立目录中，例如 `contracts/`、`apps/web/`、`agent/`、`scripts/`。

## 最新产品定位

| 问题 | 当前结论 |
| --- | --- |
| 参加什么比赛？ | Mantle Turing Test Hackathon 2026 Phase 2，**Track 06：Agentic Economy**，截止 2026-06-15（见 [09 文档](./09-hackathon-alignment.md)） |
| 它给谁用？ | 主要给 Agent 开发者 / Agent 平台接入，也给资产 Owner 使用控制台管理规则 |
| 用户怎么用？ | Agent 开发者安装 SDK；Owner 打开 Web 控制台；Agent runtime 在后台调用 SDK 执行支付 |
| 平台是什么？ | Web 控制台是 Owner 管理台，不是日常付款入口 |
| 包是什么？ | SDK/package 是 Agent 真正集成 PayGuard 的方式 |
| 当前做到哪一步？ | 合约 v1.1 已部署、`PayGuardClient` SDK 已抽出、LLM Demo Agent + 注入拦截已验证、链上 revert 证据已留存；剩余：Byreal/ERC-8004、前端对齐、提交材料 |
| CLI 是什么？ | CLI 只是 SDK 的 thin wrapper；面向评委的演示入口是 LLM Demo Agent |
| Demo 的高光是什么？ | 现场 prompt injection 攻击自己的 Agent，链上 PolicyVault 拦截 |

## 文档目录

| 文件 | 内容 | 阅读顺序 |
| --- | --- | ---: |
| [01-product-brief.md](./01-product-brief.md) | 产品定位、用户、差异化、Pitch 首页文案 | 1 |
| [02-user-flows.md](./02-user-flows.md) | Owner、Agent、Recipient、Auditor 的核心流程 | 2 |
| [03-technical-architecture.md](./03-technical-architecture.md) | 整体架构、模块边界、MVP 与进阶模块 | 3 |
| [04-smart-contract-design.md](./04-smart-contract-design.md) | PolicyVault 合约、Policy 规则、数据结构、关键函数、伪代码 | 4 |
| [05-frontend-agent-design.md](./05-frontend-agent-design.md) | 前端页面设计、Agent SDK / CLI Demo、后端/Indexer 取舍 | 5 |
| [06-mantle-integration.md](./06-mantle-integration.md) | Mantle Sepolia、MNT、低 Gas、mETH/DeFi、Byreal Skills 集成点 | 6 |
| [07-development-plan.md](./07-development-plan.md) | 开发任务拆解、3-5 天 MVP 排期、1-2 周进阶计划 | 7 |
| [08-demo-pitch-risk-testing.md](./08-demo-pitch-risk-testing.md) | 测试用例、2 分钟 Demo、3 分钟 Pitch、风险与降级方案 | 8 |
| [09-hackathon-alignment.md](./09-hackathon-alignment.md) | **当前需求基准**：赛道选择、评审映射、需求变更 R1-R7、5 天冲刺排期、提交清单 | **0（先读这个）** |
| [10-submission-materials.md](./10-submission-materials.md) | 提交材料成品：X Thread 文案、3 分钟 Pitch 讲稿、Demo 录制分镜、提交清单 | 9 |

## 建议代码目录

后续实现时建议保持如下结构，避免文档和代码混合：

```text
mantle/
  docs/
    agent-payguard/
      README.md
      01-product-brief.md
      02-user-flows.md
      03-technical-architecture.md
      04-smart-contract-design.md
      05-frontend-agent-design.md
      06-mantle-integration.md
      07-development-plan.md
      08-demo-pitch-risk-testing.md
  contracts/              # Solidity / Foundry or Hardhat
  apps/
    web/                  # Next.js frontend
  agent/                  # TypeScript Agent SDK core + CLI demo wrapper
  scripts/                # deploy / verify / helper scripts
  deployments/            # deployed addresses and ABI snapshots
```

## MVP 一句话

Agent PayGuard 让 Agent 开发者把安全支付能力接进 AI Agent，让资产 Owner 通过控制台设置规则；Agent 可以执行链上支付，但每次动作必须经过 Mantle 上的限额、白名单、Action 类型和暂停状态检查。

## MVP 成功标准

3-5 天版本必须能完整演示：

1. Owner 创建或部署一个 PolicyVault。
2. Owner 设置 Agent 地址、单笔限额、每日限额、白名单和允许 Action。
3. Owner 向 PolicyVault 存入 Mantle Sepolia 测试 MNT。
4. Agent 使用自己的测试网私钥通过 CLI Demo 调用 `executePayment`，后续 SDK 会封装这一步。
5. 规则内支付成功，并发出链上事件。
6. 超过单笔限额失败。
7. 向非白名单地址支付失败。
8. Receipt 页面展示成功执行记录和 Mantle Explorer 链接。

## 当前 Mantle Sepolia 部署

> 部署地址唯一真源：[`deployments/mantle-sepolia.json`](../../deployments/mantle-sepolia.json)。合约 v1.1 重新部署后以该文件为准。

| 项 | 值 |
| --- | --- |
| Network | Mantle Sepolia（Chain ID `5003`） |
| PolicyVault v1.1（当前） | [`0xD87a...10CA`](https://sepolia.mantlescan.xyz/address/0xD87aDfa5E4b9d42c543233500464bE08369810CA) |
| PolicyVault v1.0（历史） | [`0xF98c...96B3`](https://sepolia.mantlescan.xyz/address/0xF98cf6aBF2cB7456A707e05bFee7568Cb8a096B3) |

v1.1 已验证的 Demo 路径：

| 场景 | 结果 |
| --- | --- |
| SDK（CLI）向白名单支付 `0.01 MNT` | 成功：[tx](https://sepolia.mantlescan.xyz/tx/0x67fc9116866a7ca29f8c4b95b8ef9d449f8a88a951533849690958088efdc51a) |
| LLM Agent 解析自然语言任务后支付 `0.01 MNT` | 成功：[tx](https://sepolia.mantlescan.xyz/tx/0x3c9563288f77503205bce3d565bbbc35cc18ee94d1db60ef37bb2225ebdd2444) |
| Prompt injection：LLM 被骗构造 `2 MNT → 0x...dEaD` | SDK precheck 拦截：`NOT_WHITELISTED` |
| `--force` 超单笔限额强制上链 | 链上 revert 证据：[tx](https://sepolia.mantlescan.xyz/tx/0x62934c1e4d156b94ec31ee0d8aaee154a011e45a97bc3b22e90a9a1074923cbe) |
| `--force` 非白名单强制上链 | 链上 revert 证据：[tx](https://sepolia.mantlescan.xyz/tx/0x07aa11208884285eb7c6e93e0b36990e33887fb30511a4670b04fde957555a06) |

## 当前技术默认选型

| 层 | 默认选择 |
| --- | --- |
| 合约 | Solidity `^0.8.23`，优先 Foundry，也可 Hardhat |
| 链 | Mantle Sepolia，Chain ID `5003` |
| 支付资产 | 原生 MNT |
| 前端 | Next.js + React + TypeScript + Tailwind CSS |
| 钱包交互 | wagmi + viem |
| Agent | Node.js + TypeScript + viem；`PayGuardClient` SDK + CLI thin wrapper + LLM Demo Agent |
| 后端 | MVP 不需要，前端直接读合约事件 |
| LLM | Demo 层必做（自然语言解析 + prompt injection 演示），核心链路不依赖；优先 Z.ai credits，OpenAI 兼容接口 |

## 不做清单

MVP 阶段明确不做：

- 不做复杂 Account Abstraction。
- 不做多链。
- 不做发币。
- 不做完整 DeFi 聚合器。
- 不做真实 RWA 法务闭环。
- 不做高频交易机器人。
- 不做必须依赖 LLM 成功调用的核心流程。
- 不做复杂后端 Indexer。

## 黑客松叙事核心

> AI Agent 要进入金融世界，第一步不是更聪明，而是更可控、可审计、可支付。
