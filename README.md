# Agent PayGuard

AI Agent 的链上支付风控基础设施：Agent 开发者通过 `PayGuardClient` SDK 接入，资产 Owner 通过控制台配置规则，`PolicyVault` 在 Mantle 上强制执行限额、白名单、Action 类型、暂停和撤销。

Agent PayGuard lets an owner fund a `PolicyVault` and authorize an AI Agent wallet to execute native MNT payments only within on-chain policy limits. The product shape is **SDK for agents + control console for humans + on-chain policy enforcement on Mantle**.

> The model can be fooled. The chain cannot.

**Hackathon**: Mantle Turing Test Hackathon 2026 — Track 06 Agentic Economy. See [docs/agent-payguard/09-hackathon-alignment.md](./docs/agent-payguard/09-hackathon-alignment.md).

## Repository Structure

```text
docs/agent-payguard/   Product, architecture, contract, demo and planning docs
contracts/             PolicyVault v1.1, Foundry tests and deploy script
apps/web/              Next.js Owner control console and receipt UI
agent/                 PayGuard SDK core, CLI wrapper and LLM demo agent
  src/sdk/             PayGuardClient + types (the importable SDK)
  src/pay.ts           CLI thin wrapper around the SDK
  src/demo-agent.ts    LLM-driven demo agent (prompt-injection showcase)
  src/skill.ts         OpenClaw-style skill CLI (status/precheck/pay, -o json)
  samples/             Prompt-injection attack sample
skills/payguard/       Agent Skill package (SKILL.md, Byreal-Skills-compatible format)
scripts/               Deploy and helper scripts
deployments/           Deployed addresses and tx evidence (single source of truth)
```

## Product Usage Model

| 使用者 | 怎么使用 | 目的 |
| --- | --- | --- |
| Agent developer / platform | `new PayGuardClient(...)` + `executePayment(...)` | 让 Agent 自动付款但受链上 policy 约束 |
| Owner / asset admin | Web 控制台：配置 Agent、限额、白名单、暂停/撤销/取回资金 | 管理资产权限和审计 Agent 行为 |
| AI Agent runtime | 后台通过 SDK 调用 `PolicyVault.executePayment` | 执行真实链上支付 |
| Viewer / auditor | Receipt 页面和 Mantle Explorer | 验证 Agent 是否按规则执行 |

## Current State (v1.1)

- `PolicyVault.sol` v1.1：限额、白名单、Action 开关、暂停/撤销、`ownerWithdraw`（Owner 资金永不锁死）、`isAllowedFor`（身份与策略解耦的预检查）
- `PayGuardClient` SDK：precheck + 受控支付 + 可读的拒绝原因（`EXCEEDS_PER_TX` 等）
- LLM Demo Agent：自然语言任务 → LLM 解析 → SDK 受控支付；含 prompt injection 拦截演示
- 24 个 Foundry 测试全绿
- Next.js 控制台（Dashboard / Configure / Simulator / Receipt）

## Mantle Sepolia Deployment

> 唯一真源：[`deployments/mantle-sepolia.json`](./deployments/mantle-sepolia.json)

| Item | Value |
| --- | --- |
| Network / Chain ID | Mantle Sepolia / `5003` |
| PolicyVault v1.1 | [`0xD87aDfa5E4b9d42c543233500464bE08369810CA`](https://sepolia.mantlescan.xyz/address/0xD87aDfa5E4b9d42c543233500464bE08369810CA) |
| Owner | `0xaE2F93A880550eDA852504e031ff3927981Df49B` |
| Agent | `0x8114D2D2D34F127741BC45A533EEf9D190F4dD43` |
| Agent ERC-8004 identity | Agent ID `2` in the official [IdentityRegistry](https://sepolia.mantlescan.xyz/address/0x8004A3718bD35CF767BC0E718bf21Ec4073502f0) — [registration tx](https://sepolia.mantlescan.xyz/tx/0x1e55c83cdac49b875fab7b62665d84c21a6a634920e5fd7c8c730f7f248d37a1) |

Demo evidence (all on v1.1):

| Scenario | Result |
| --- | --- |
| SDK payment within policy (0.01 MNT) | success: [tx](https://sepolia.mantlescan.xyz/tx/0x67fc9116866a7ca29f8c4b95b8ef9d449f8a88a951533849690958088efdc51a) |
| LLM agent payment from natural-language task | success: [tx](https://sepolia.mantlescan.xyz/tx/0x3c9563288f77503205bce3d565bbbc35cc18ee94d1db60ef37bb2225ebdd2444) |
| Prompt injection (LLM tricked into 2 MNT → 0x...dEaD) | blocked by precheck: `NOT_WHITELISTED` |
| Forced past SDK, exceeds per-tx limit | on-chain revert: [tx](https://sepolia.mantlescan.xyz/tx/0x62934c1e4d156b94ec31ee0d8aaee154a011e45a97bc3b22e90a9a1074923cbe) |
| Forced past SDK, recipient not whitelisted | on-chain revert: [tx](https://sepolia.mantlescan.xyz/tx/0x07aa11208884285eb7c6e93e0b36990e33887fb30511a4670b04fde957555a06) |

Enforcement is two-layered: the SDK precheck rejects doomed payments off-chain (saving gas), and even when the SDK is bypassed (`--force`), the contract itself reverts on-chain — see the two failed transactions above.

## Requirements

- Node.js 20+
- npm 10+
- Foundry / Forge

## Install

```bash
npm install
```

## Test Contracts

```bash
npm run test:contracts
```

## Run Frontend

```bash
npm run dev:web
```

Open `http://localhost:3000`.

## Agent SDK

```ts
import { PayGuardClient } from "./sdk/PayGuardClient.js";

const payguard = new PayGuardClient({
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  vaultAddress: "0xD87aDfa5E4b9d42c543233500464bE08369810CA",
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
});

const result = await payguard.executePayment({
  to: "0xRecipient",
  amount: "0.01",
  memo: "API subscription",
});
// result.status === "success" | "rejected" (with stage + readable reason)
```

## CLI Demo

Create `agent/.env` from `agent/.env.example`, then:

```bash
# Within policy: succeeds on-chain
npm run agent:pay -- --to 0xRecipient --amount 0.01 --memo "demo payment"

# Policy violation: rejected by SDK precheck, no tx sent
npm run agent:pay -- --to 0xRecipient --amount 2 --memo "exceeds per-tx"

# Force past the SDK to record an on-chain revert (proof of enforcement)
npm run agent:pay -- --to 0xRecipient --amount 2 --memo "revert proof" --force
```

## LLM Demo Agent

Set `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` in `agent/.env` (any OpenAI-compatible endpoint), then:

```bash
# Natural-language task: LLM parses, SDK executes, chain enforces
npm run agent:demo -- --task "Pay 0.01 MNT to 0xRecipient for the June API subscription"

# Prompt-injection attack: the LLM gets fooled, the PolicyVault blocks it
npm run agent:demo -- --task-file ./samples/injection-invoice.txt
```

The LLM only parses tasks. Final authorization always happens on-chain.

## Agent Skill (OpenClaw / Byreal Skills format)

PayGuard ships as an installable Agent Skill (`skills/payguard/SKILL.md`) following
the same conventions as Byreal Agent Skills: JSON output for agent parsing, exit
code `2` for policy rejections, and hard constraints the agent must respect.

```bash
npm run payguard -- status -o json
npm run payguard -- precheck --to 0xRecipient --amount 0.01 -o json
npm run payguard -- pay --to 0xRecipient --amount 0.01 --memo "API subscription" -o json
npm run payguard -- catalog
```

## Deploy PolicyVault v1.1

Put `OWNER_PRIVATE_KEY` in the gitignored root `.env`, then:

```bash
./scripts/deploy-v1.1.sh
```

The script deploys, whitelists the demo recipient, funds the vault and verifies on-chain state. Update `deployments/mantle-sepolia.json`, `agent/.env` and the frontend default address afterwards.

## Documentation

Start with [docs/agent-payguard/README.md](./docs/agent-payguard/README.md). The current sprint baseline is [docs/agent-payguard/09-hackathon-alignment.md](./docs/agent-payguard/09-hackathon-alignment.md).
