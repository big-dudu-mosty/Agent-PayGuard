# 05. 前端、Agent SDK 与 CLI Demo 设计

> 2026-06-10 更新：SDK 抽取与 LLM Demo Agent 提升为黑客松冲刺必做项（见 [09 文档](./09-hackathon-alignment.md) R1/R2）；Simulator 预检查改用合约 v1.1 的 `isAllowedFor`。

## 前端设计目标

前端不是做成复杂钱包，也不是 Agent 的日常付款入口。它的真实定位是 **Owner Control Console**：人用它做授权、限额、白名单、暂停/撤销和审计；Agent 的高频执行应该发生在后台 SDK 中。

MVP 前端服务 Demo：

1. 让评委快速看到当前 Vault 的 policy。
2. 让 Owner 能设置 Agent、限额、白名单和状态。
3. 让 Agent 的成功/失败执行有明确反馈。
4. 让成功执行记录可以被审计。

MVP 建议做成一个 Next.js 单页应用，用 Tab 或左侧导航分成四个区域：

- Dashboard
- Configure Policy
- Agent Action Simulator / SDK Demo Helper
- Receipt / Explorer

## 技术栈

| 项 | 选择 |
| --- | --- |
| Framework | Next.js |
| Language | TypeScript |
| Wallet | wagmi + viem |
| Styling | Tailwind CSS |
| UI | shadcn/ui 可选 |
| Chain | Mantle Sepolia |
| Contract Calls | viem / wagmi hooks |
| Events | viem `getLogs` or `watchContractEvent` |

## 页面结构

### 1. Dashboard

#### 核心功能

展示当前 Vault 状态：

- 连接钱包地址。
- 当前网络。
- PolicyVault 地址。
- Vault MNT 余额。
- Owner 地址。
- Agent 地址。
- 单笔限额。
- 每日限额。
- 今日已使用额度。
- 白名单地址列表。
- Agent 状态：Active / Paused / Revoked。
- Mantle Explorer 合约链接。

#### Demo 价值

Dashboard 是评委理解项目的第一屏。它应该像一个「Agent 资金控制台」，而不是普通钱包页面。

#### 合约读取

- `getPolicy()`
- `getDailySpent()`
- `whitelistedRecipients(address)`
- `allowedActions(uint8)`
- `eth_getBalance(vaultAddress)`

### 2. Create / Configure Policy

#### 核心功能

- 输入 Agent 地址。
- 输入单笔限额。
- 输入每日限额。
- 添加或移除白名单收款地址。
- 开启或关闭 `PAYMENT` action。
- 暂停或恢复 Agent。
- 撤销 Agent。
- 可选：部署新的 PolicyVault。

#### MVP 取舍

如果时间紧，可以不做前端部署合约，只让用户填入已经部署好的 Vault 地址，然后前端完成配置和展示。  
如果时间够，再加 `Create Vault` 按钮。

#### 合约写入

- `setAgent(address)`
- `setLimits(uint256,uint256)`
- `setWhitelist(address,bool)`
- `setAllowedAction(uint8,bool)`
- `pauseAgent(bool)`
- `revokeAgent()`

### 3. Agent Action Simulator / SDK Demo Helper

#### 核心功能

- 输入收款地址。
- 输入金额。
- 输入 memo。
- 点击「Policy Precheck」调用 `isAllowedFor(agent, to, amount)`。
- 展示是否允许执行。
- 展示失败原因。
- 可选：提供 Agent CLI Demo 命令复制。

#### v1.0 的坑（v1.1 已修复）

v1.0 的 `isAllowed` 用 `msg.sender` 判定身份。前端由 Owner 钱包发起 `eth_call` 时永远返回 `NOT_AGENT`。合约 v1.1 新增 `isAllowedFor(caller, to, amount)`，前端 Simulator 直接传入 agent 地址即可，无需 account override。详见 [04 文档 v1.1 章节](./04-smart-contract-design.md)。

#### 重要说明

真正的 Agent 执行应该由 Agent runtime 通过 SDK 使用 Agent 私钥发起，不应由 Owner 钱包直接执行。  
因此 MVP 前端里建议不要直接用浏览器执行 Agent 交易，除非为了演示准备一个 Agent 钱包连接。

更稳的 Demo 方式：

1. 前端展示任务输入和 policy precheck。
2. 终端运行 Agent CLI Demo 执行交易，模拟后台 Agent SDK 调用。
3. 前端 Receipt 页面自动或手动刷新显示事件。

#### 合约读取

- `isAllowed(address,uint256)`

### 4. Receipt / Explorer

#### 核心功能

展示所有成功执行事件：

- tx hash
- block number
- 时间
- Agent 地址
- 收款地址
- 金额
- 当天累计花费
- memo
- Mantle Explorer 链接

失败事件：

- MVP 不在链上存储失败事件。
- 前端可以提供「Last Simulation Result」区域显示本地失败原因。
- Agent SDK / CLI Demo 输出失败原因用于 Demo。

#### 事件读取

主要读取：

- `PaymentExecuted`
- `PolicyUpdated`
- `WhitelistUpdated`
- `AgentPaused`
- `AgentRevoked`

MVP 只展示 `PaymentExecuted` 也可以。

## 页面表

| 页面 | 核心功能 | 需要读写的合约方法 | Demo 作用 | MVP 必须 |
| --- | --- | --- | --- | --- |
| Dashboard | 看 Vault 和 policy 状态 | `getPolicy`, `getDailySpent`, balance | 建立信任和上下文 | 是 |
| Configure Policy | 设置 Agent、限额、白名单、Action | `setAgent`, `setLimits`, `setWhitelist`, `setAllowedAction`, `pauseAgent` | 展示 Owner 控制权 | 是 |
| Agent Action Simulator / SDK Demo Helper | 预检查支付任务，生成 CLI Demo 命令 | `isAllowedFor` | 展示规则判断和 Agent 调用方式 | 是 |
| Receipt / Explorer | 展示执行记录 | event logs | 展示可审计 | 是 |
| Owner Withdraw | Owner 取回 Vault 资金 | `ownerWithdraw` | 证明 Owner 是最终控制人 | 建议（可降级为脚本演示） |
| Create Vault | 部署合约 | deploy bytecode | 产品感更强 | 可选 |

## 前端状态模型

建议前端维护以下状态：

```ts
type VaultState = {
  vaultAddress: `0x${string}` | null;
  owner: `0x${string}` | null;
  agent: `0x${string}` | null;
  maxPerTx: bigint;
  dailyLimit: bigint;
  currentDay: bigint;
  dailySpent: bigint;
  paused: boolean;
  revoked: boolean;
  balance: bigint;
};

type RecipientRule = {
  address: `0x${string}`;
  whitelisted: boolean;
};

type PaymentEvent = {
  txHash: `0x${string}`;
  blockNumber: bigint;
  agent: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  day: bigint;
  dailySpentAfter: bigint;
  memo: string;
};
```

## Mantle Sepolia 前端配置

```ts
export const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://sepolia.mantlescan.xyz",
    },
  },
} as const;
```

## UX 设计重点

### Dashboard 文案

建议用短句突出安全价值：

- Agent Status: Active
- Max per transaction: 1 MNT
- Daily budget: 10 MNT
- Today spent: 0.5 / 10 MNT
- Whitelisted recipients only
- Every successful action is auditable on Mantle

### 失败提示文案

失败提示要明确表达「这是安全能力」：

| 失败原因 | UI 文案 |
| --- | --- |
| `ExceedsMaxPerTx` | Rejected by policy: amount exceeds per-transaction limit |
| `ExceedsDailyLimit` | Rejected by policy: daily budget exceeded |
| `RecipientNotWhitelisted` | Rejected by policy: recipient is not whitelisted |
| `AgentPausedError` | Rejected by policy: agent is paused |
| `NotAgent` | Rejected by policy: caller is not authorized agent |

## Agent SDK 与 CLI Demo 设计

## Agent MVP 功能

正式产品里，Agent 开发者应该安装 SDK/package 并在自己的 Agent workflow 中调用。SDK 抽取已是冲刺必做项（09 文档 R2），CLI 与 LLM Demo Agent 都是 SDK 之上的薄入口。

Agent SDK / CLI Demo 必须体现：

1. 它是独立执行者。
2. 它使用 Agent 自己的测试网私钥。
3. 它不接触 Owner 私钥。
4. 它只能通过 PolicyVault 执行动作。
5. 它超出规则会失败。

## Agent 文件结构

代码放在仓库根目录的 `agent/`：

```text
agent/
  package.json
  tsconfig.json
  .env.example
  src/
    abi.ts
    config.ts
    sdk/
      PayGuardClient.ts   # 必做：可 import 的 SDK core
      types.ts            # PaymentTask / PaymentResult / PolicyRejection
    pay.ts                # CLI thin wrapper：解析参数 + 打印结果
    demo-agent.ts         # 必做：LLM Demo Agent（自然语言任务 -> SDK 支付）
    skills/
      byreal.ts           # 冲刺目标：Byreal Skill 包装（可降级为设计稿）
```

三个入口（CLI、LLM Demo Agent、Byreal Skill）共用同一个 `PayGuardClient`，不允许各自重复实现链上调用逻辑。

## 关键依赖

```bash
npm install viem dotenv
npm install -D typescript tsx @types/node
```

## 环境变量

```bash
MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
AGENT_PRIVATE_KEY=0x...
VAULT_ADDRESS=0x...
```

安全要求：

- `.env` 不提交。
- `.env.example` 只放字段名。
- Demo 使用新建测试网 Agent 钱包。
- Agent 钱包只放少量测试 MNT 用于 Gas。

## SDK 目标接口

```ts
const payguard = new PayGuardClient({
  rpcUrl: process.env.MANTLE_SEPOLIA_RPC!,
  vaultAddress: process.env.VAULT_ADDRESS as `0x${string}`,
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
});

const result = await payguard.executePayment({
  to: "0xRecipient",
  amount: "0.01",
  memo: "demo payment",
});
```

## CLI Demo 执行命令

对外文档统一使用根目录的 npm script：

```bash
npm run agent:pay -- --to 0xRecipient --amount 0.01 --memo "demo payment"
```

Demo 命令：

```bash
# 规则内成功
npm run agent:pay -- --to 0xWhitelisted --amount 0.01 --memo "valid agent payment"

# 超过单笔限额：默认被 SDK precheck 拒绝，不发交易
npm run agent:pay -- --to 0xWhitelisted --amount 2 --memo "should exceed per tx"

# 非白名单：默认被 SDK precheck 拒绝，不发交易
npm run agent:pay -- --to 0xNotWhitelisted --amount 0.01 --memo "should fail whitelist"

# 加 --force 跳过 precheck 直接发交易，制造真实链上 revert（用于证明链上强制力，见 09 文档 R6）
npm run agent:pay -- --to 0xWhitelisted --amount 2 --memo "onchain revert proof" --force
```

注意拒绝是双层的：默认演示 SDK precheck 拒绝（快、省 gas）；`--force` 的链上 revert 证明强制力来自合约而不是脚本。Demo 与 pitch 必须把这两层讲清楚。

## LLM Demo Agent 设计（冲刺必做，09 文档 R1）

`agent/src/demo-agent.ts` 是面向评委的「真实 AI」演示入口：

```bash
# 正常任务：自然语言 -> LLM 解析 -> SDK 受控支付
npm run agent:demo -- --task "Pay 0.01 MNT to 0xRecipient for API subscription"

# Prompt injection 攻击：任务文本藏恶意指令，Agent 被骗，PayGuard 拦截
npm run agent:demo -- --task-file ./injection-sample.txt
```

设计要求：

1. LLM 只负责把自然语言解析成 `{ action, to, amount, memo }`，**最终权限判断永远在链上**。
2. LLM 供应商优先用赛事赞助方 Z.ai 的 credits，接口做成 OpenAI 兼容，可换供应商。
3. LLM 调用失败时降级为结构化输入，Demo 不依赖 LLM 成功。
4. 注入用例的预期输出：终端清晰展示「LLM 解析出的恶意 payment → PayGuard 拒绝 + 原因」，这是 Demo 的高光时刻。
5. 不做多轮对话、不做工具编排，这是一个最小可信的 Agent 演示，不是 Agent 框架。

## Agent 核心伪代码

```ts
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { abi } from "./abi";

const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MANTLE_SEPOLIA_RPC!] },
  },
};

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(process.env.MANTLE_SEPOLIA_RPC),
});

const walletClient = createWalletClient({
  account,
  chain: mantleSepolia,
  transport: http(process.env.MANTLE_SEPOLIA_RPC),
});

async function main() {
  const to = readCliArg("--to") as `0x${string}`;
  const amountInput = readCliArg("--amount");
  const memo = readCliArg("--memo") ?? "agent payment";
  const amount = parseEther(amountInput);

  console.log("Agent:", account.address);
  console.log("Vault:", vaultAddress);
  console.log("Task:", `pay ${formatEther(amount)} MNT to ${to}`);

  const precheck = await publicClient.readContract({
    address: vaultAddress,
    abi,
    functionName: "isAllowed",
    args: [to, amount],
    account: account.address,
  });

  console.log("Policy precheck:", precheck);

  try {
    const hash = await walletClient.writeContract({
      address: vaultAddress,
      abi,
      functionName: "executePayment",
      args: [to, amount, memo],
    });

    console.log("Transaction sent:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction status:", receipt.status);
  } catch (error: any) {
    console.error("Agent action rejected by PayGuard:");
    console.error(error.shortMessage ?? error.message);
    process.exitCode = 1;
  }
}

main();
```

下一步代码应把 `main()` 里的 precheck、writeContract、waitReceipt 和错误解析抽到 `PayGuardClient`，让 CLI 只负责读取参数和打印结果。

## 是否需要接入 LLM

**2026-06-10 结论变更：需要（作为 Demo 层，不是核心依赖）。**

本届黑客松主题是 AI Awakening，Demo 中没有真实 AI 行为是致命减分项（见 09 文档 R1）。但原则不变：

1. LLM 只做任务解析，最终权限判断在链上。
2. 核心支付链路（合约 + SDK + CLI）不依赖 LLM，LLM 翻车时降级为结构化输入。
3. LLM 的演示价值集中在 prompt injection 拦截场景。

最小 LLM 方案：

```text
Input: "Pay 0.01 MNT to 0xabc for API subscription"
LLM output JSON:
{
  "action": "PAYMENT",
  "to": "0xabc",
  "amount": "0.01",
  "memo": "API subscription"
}
```

注意：LLM 只做解析，不做最终权限判断。最终判断必须在链上。

## 后端 / Indexer 是否需要

## 方案 A：无后端

| 项 | 说明 |
| --- | --- |
| 工作方式 | 前端直接读合约状态和事件 |
| 优点 | 快、少部署、少故障点 |
| 缺点 | 历史事件读取依赖 RPC，失败记录不持久化 |
| 开发成本 | 低 |
| MVP 推荐 | 是 |

## 方案 B：轻量后端 / Indexer

| 项 | 说明 |
| --- | --- |
| 工作方式 | Node.js 监听事件，写入 SQLite / Postgres，前端查 API |
| 优点 | 历史记录稳定，可记录失败动作和 off-chain metadata |
| 缺点 | 多一个服务，多一个数据库，多一份部署风险 |
| 开发成本 | 中 |
| MVP 推荐 | 否 |

## 推荐

3-5 天 MVP 用方案 A。  
1-2 周版本再做方案 B。
