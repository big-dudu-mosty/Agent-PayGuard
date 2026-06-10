# 07. 开发任务与排期

> 2026-06-10 更新：本文档的「3-5 天 MVP 排期」已执行完成（合约 v1.0、前端、CLI Demo、Mantle Sepolia 部署均已交付），保留作为历史记录。当前有效的排期是 [09 文档](./09-hackathon-alignment.md) 的 5 天冲刺计划（06-10 ~ 06-15），优先级见下方「黑客松冲刺优先级」。

## 黑客松冲刺优先级（2026-06-10 ~ 06-15）

| 优先级 | 任务 | 对应 09 需求 | 是否可砍 |
| --- | --- | --- | --- |
| P0 | 合约 v1.1：`ownerWithdraw` + `isAllowedFor` + 测试 + 重新部署 | R5 | 不可砍 |
| P0 | 抽出 `PayGuardClient` SDK，CLI 改 thin wrapper | R2 | 不可砍 |
| P0 | LLM Demo Agent + prompt injection 拦截用例 | R1 | 不可砍 |
| P0 | `--force` 链上 revert 证据交易（至少 2 笔） | R6 | 不可砍 |
| P0 | Demo 视频、Pitch、X Thread、DoraHacks 提交 | R7 | 不可砍 |
| P1 | Byreal Skills 调研 + `guarded_mnt_payment` 包装 | R3 | 可降级为设计页 |
| P1 | 前端对齐：Simulator 改 `isAllowedFor`、Receipt 校验 | R5 | 不可砍（工作量小） |
| P2 | ERC-8004 最小集成 | R4 | 可降级为 pitch 页 |
| P2 | 前端 Owner Withdraw UI | R5 | 可降级为脚本演示 |

以下为原 MVP 计划（已完成，保留备查）。

## 开发原则

1. 先跑通合约闭环，再做前端美化。
2. 先做 MNT 支付，不做 DeFi。
3. 先做单 Vault，不做 Factory。
4. 先做 PayGuard SDK core + CLI Demo wrapper，不做复杂 LLM。
5. 先保证 Demo 能重复运行，再加增强功能。

## 推荐代码结构

```text
mantle/
  docs/
    agent-payguard/
  contracts/
    src/
      PolicyVault.sol
    test/
      PolicyVault.t.sol
    script/
      DeployPolicyVault.s.sol
  apps/
    web/
      app/
      components/
      lib/
  agent/
    src/
      sdk/
        PayGuardClient.ts
        types.ts
      pay.ts
      abi.ts
      config.ts
  deployments/
    mantle-sepolia.json
```

## 合约任务

| 任务 | 文件 | 说明 |
| --- | --- | --- |
| 编写核心合约 | `contracts/src/PolicyVault.sol` | 实现 policy、支付、事件 |
| 编写测试 | `contracts/test/PolicyVault.t.sol` | 覆盖成功和失败路径 |
| 编写部署脚本 | `contracts/script/DeployPolicyVault.s.sol` | 部署到 Mantle Sepolia |
| 保存部署信息 | `deployments/mantle-sepolia.json` | 地址、chainId、deployer、timestamp |
| 导出 ABI | `agent/src/abi.ts` 和前端 ABI | 给前端和 Agent 使用 |

## 合约函数开发顺序

1. `constructor`
2. `receive`
3. `setAgent`
4. `setLimits`
5. `setWhitelist`
6. `setAllowedAction`
7. `pauseAgent`
8. `revokeAgent`
9. `_checkPayment`
10. `_rollDailyWindowIfNeeded`
11. `executePayment`
12. `isAllowed`
13. `getPolicy`
14. `getDailySpent`

## 合约测试顺序

1. Constructor 初始化正确。
2. Vault 可以接收 MNT。
3. Owner 可以设置 Agent。
4. 非 Owner 不能设置策略。
5. 白名单内支付成功。
6. 非白名单支付失败。
7. 超单笔限额失败。
8. 超每日限额失败。
9. 非 Agent 调用失败。
10. 暂停后失败。
11. 撤销后失败。
12. 成功支付发出事件。

## 前端任务

| 任务 | 说明 |
| --- | --- |
| 初始化 Next.js | 建议放在 `apps/web` |
| 配置 Mantle Sepolia | chain id、RPC、Explorer |
| 钱包连接 | Owner 连接钱包 |
| Vault 地址输入/读取 | 支持 `.env` 默认地址和手动输入 |
| Dashboard | 展示 policy、余额、状态 |
| Configure Policy | 写入 Agent、limit、whitelist、pause |
| Agent Simulator | 调用 `isAllowed` 做预检查 |
| Receipt 页面 | 读取 `PaymentExecuted` events |
| Explorer 链接 | address 和 tx hash 都可点击 |

## Agent SDK / CLI Demo 任务

| 任务 | 说明 |
| --- | --- |
| 初始化 `agent/` | TypeScript + viem |
| 配置 `.env.example` | RPC、Agent 私钥、Vault 地址 |
| 抽象 `PayGuardClient` | 封装 public client、wallet client、policy precheck 和 payment |
| 定义 SDK types | `PaymentTask`, `PaymentResult`, `PolicyRejection` |
| 保留 CLI wrapper | `pay.ts` 解析 `--to`, `--amount`, `--memo` 后调用 SDK |
| 读取 policy | SDK 调用 `isAllowed` |
| 执行支付 | SDK 调用 `executePayment` |
| 错误处理 | SDK 返回 readable failure reason，CLI 负责打印 |
| Demo 命令 | 准备成功、超限、非白名单三条 |

## Demo / Pitch 任务

| 任务 | 说明 |
| --- | --- |
| Demo 视频脚本 | 2 分钟，按时间线录 |
| Pitch Deck | Problem、Solution、Why Mantle、Demo、Future |
| README | 安装、部署、运行、合约地址 |
| 架构图 | 使用 Mermaid 或导出 PNG |
| 测试交易记录 | 成功 tx、失败截图、Explorer 链接 |
| X Thread 材料 | 项目 pitch、demo video、GitHub、contract address |

## 任务优先级表

| 优先级 | 任务 | 模块 | 预计难度 | 是否必须 | 完成标准 |
| --- | --- | --- | --- | --- | --- |
| P0 | 实现 `PolicyVault.sol` | 合约 | 中 | 是 | 本地编译通过 |
| P0 | 写核心测试 | 合约 | 中 | 是 | 10 个关键测试通过 |
| P0 | 部署到 Mantle Sepolia | 合约 | 中 | 是 | 有合约地址和 Explorer 链接 |
| P0 | Agent CLI Demo 成功支付 | Agent | 低 | 是 | 输出 tx hash |
| P0 | Agent CLI Demo 展示失败 | Agent | 低 | 是 | 超限和非白名单能失败 |
| P1 | 抽出 `PayGuardClient` SDK | Agent | 中 | 建议 | CLI 变成 thin wrapper，Agent 开发者可 import |
| P0 | Dashboard | 前端 | 中 | 是 | 能读 policy 和余额 |
| P0 | Configure Policy | 前端 | 中 | 是 | 能写入规则 |
| P1 | Receipt 页面 | 前端 | 中 | 是 | 能展示成功事件 |
| P1 | README | 文档 | 低 | 是 | 其他人能跑 Demo |
| P1 | Demo 视频 | Demo | 中 | 是 | 2 分钟完整闭环 |
| P2 | Create Vault UI | 前端 | 中 | 可选 | 前端可部署合约 |
| P2 | LLM Parser | Agent | 中 | 可选 | 自然语言转 JSON |
| P2 | Byreal Skills | Agent | 中 | 可选 | 可作为赛道加分 |
| P3 | DeFi Action | 合约 | 高 | 否 | 有充分时间再做 |
| P3 | 后端 Indexer | 后端 | 中 | 否 | MVP 不需要 |

## 3-5 天 MVP 排期

## Day 1：合约核心闭环

### 任务

- 初始化合约工程。
- 编写 `PolicyVault.sol`。
- 实现 owner、agent、limits、whitelist、payment。
- 编写核心测试。

### 产出

- `PolicyVault.sol`
- `PolicyVault` 测试文件
- ABI 初版

### 验收标准

- 本地测试通过：
  - 成功支付。
  - 超单笔失败。
  - 超每日失败。
  - 非白名单失败。
  - 非 Agent 失败。

### 风险

- 每日限额逻辑写错。
- 事件参数不利于前端展示。

### 如果时间不够

先砍掉 `setAllowedAction` 的 UI，但合约中保留 action check。

## Day 2：部署 + 前端配置

### 任务

- 配置 Mantle Sepolia RPC。
- 部署合约。
- 初始化 Next.js 前端。
- 配置 wagmi / viem。
- 完成 Dashboard。
- 完成 Configure Policy 基础表单。

### 产出

- Mantle Sepolia 合约地址。
- Dashboard 可读 policy。
- Configure 页面可设置 Agent、limits、whitelist。

### 验收标准

- 前端能显示 Vault 地址、Agent、限额、今日额度和余额。
- 前端能发交易修改白名单。

### 风险

- RPC 不稳定。
- 钱包网络切换失败。

### 如果时间不够

不做 Create Vault UI，直接使用部署好的合约地址。

## Day 3：Agent SDK / CLI Demo + 支付闭环

### 任务

- 初始化 `agent/`。
- 编写 `pay.ts` CLI Demo。
- 如时间允许，抽出 `sdk/PayGuardClient.ts`。
- Agent 调用 `isAllowed`。
- Agent 调用 `executePayment`。
- 输出 tx hash 和失败原因。
- 前端 Agent Simulator 支持 precheck。

### 产出

- Agent CLI Demo。
- 可选 `PayGuardClient` 初版。
- 三条 Demo 命令。
- 成功交易 hash。
- 失败命令截图或终端记录。

### 验收标准

- `pay 0.01 MNT to whitelisted` 成功。
- `pay 2 MNT` 超单笔失败。
- `pay 0.01 MNT to non-whitelisted` 失败。

### 风险

- Agent 钱包没有测试 MNT。
- ABI 不同步。

### 如果时间不够

Agent CLI Demo 只支持固定参数，不做复杂任务解析；SDK 抽象可以推迟到 Day 4 或进阶版本。

## Day 4：Receipt 页面 + Demo 打磨

### 任务

- 读取 `PaymentExecuted` 事件。
- 展示 tx hash、Agent、recipient、amount、memo。
- 添加 Mantle Explorer 链接。
- 美化 Dashboard。
- 录制首次 Demo 草稿。

### 产出

- Receipt / Explorer 页面。
- 可点击 Explorer 链接。
- Demo 草稿视频。

### 验收标准

- 新支付成功后，Receipt 页面能看到记录。
- 2 分钟内能讲清楚成功和失败。

### 风险

- `getLogs` fromBlock 设置错误。
- RPC 拉历史事件慢。

### 如果时间不够

Receipt 页面只展示最近一次成功 tx，历史列表手动填 fallback。

## Day 5：Pitch / README / 最终检查

### 任务

- 写 README。
- 整理部署地址。
- 录正式 Demo。
- 准备 Pitch Deck。
- 准备 X Thread 文案。
- 最后跑一次完整流程。

### 产出

- GitHub README。
- Demo 视频。
- 合约地址。
- 成功 tx 链接。
- Pitch 讲稿。

### 验收标准

- 从打开前端到 Agent 执行成功和失败，流程可重复。
- 所有提交材料齐全。

### 风险

- 临场网络故障。

### 如果时间不够

提交录屏 Demo，不依赖现场实时交易。

## 1-2 周进阶版本规划

| 进阶功能 | 价值 | 技术难度 | 是否建议做 | 为什么 |
| --- | --- | ---: | --- | --- |
| Byreal Skills 集成 | 提升赛道契合度 | 3 | 建议 | Agentic Economy 评审看重 sponsor 集成 |
| PayGuard SDK 包装 | 让产品定位从 Demo 变成 Infra | 2 | 强烈建议 | 这是回答“用户怎么用”的关键 |
| LLM 自然语言解析 | 增强 Agent 感 | 2 | 建议 | 只做解析，不影响核心流程 |
| AI Policy Generator | 提升 UX | 2 | 建议 | 用户输入自然语言生成限额/白名单配置 |
| 风险策略模板 | 提升产品完整度 | 2 | 建议 | 例如 API payment、DAO ops、DeFi safe mode |
| Create Vault UI | 产品感更强 | 3 | 建议 | 让用户完整创建 |
| 多 Agent 支持 | 面向组织场景 | 3 | 可做 | 每个 Agent 不同预算 |
| mETH / DeFi action | Mantle 资产契合 | 4 | 谨慎 | 有加分，但要控制范围 |
| 后端 Indexer | Receipt 更稳定 | 3 | 可做 | 可记录失败动作 |
| ERC-8004 / Reputation | Agent 身份叙事强 | 4 | 可讲不一定做 | 工程量不小 |
| AA / gasless | UX 好 | 5 | 不建议 | 容易吞掉时间 |
| 完整 DeFi Bot | 看起来强 | 5 | 不建议 | 偏离 PayGuard 核心 |
