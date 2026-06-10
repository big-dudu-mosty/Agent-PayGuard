---
name: payguard
description: "Agent PayGuard: guarded native MNT payments on Mantle through an on-chain PolicyVault. Check vault policy/budget, precheck payments, and execute payments that are enforced by per-transaction limits, daily limits and a recipient whitelist. Use when an agent needs to pay for APIs, services, subscriptions or bounties on Mantle without holding the owner's funds."
metadata:
  openclaw:
    homepage: https://github.com/big-dudu-mosty/Agent-PayGuard
    requires:
      config:
        - agent/.env (AGENT_PRIVATE_KEY, VAULT_ADDRESS, MANTLE_SEPOLIA_RPC)
    install:
      - kind: node
        package: "."
        note: "npm install inside the repository, then run via npm run payguard --"
---

# PayGuard — Guarded MNT Payments for Agents

PayGuard lets an AI agent spend MNT on Mantle **without holding the owner's private key**.
The owner funds a PolicyVault and sets rules (per-tx limit, daily budget, recipient
whitelist, pause/revoke). The agent signs with its own wallet; every payment is
checked and enforced **on-chain**. If a task (or a prompt injection) tricks the
agent into an out-of-policy payment, the contract rejects it.

## Capability Discovery

```bash
# Structured capability catalog (JSON)
npm run payguard -- catalog
```

## Commands

All commands support `-o json` for structured output that agents should parse.

```bash
# Vault policy, today's spend and balance (read-only)
npm run payguard -- status -o json

# Would this payment be allowed? (read-only, no transaction)
npm run payguard -- precheck --to 0xRecipient --amount 0.01 -o json

# Execute a guarded payment (write; enforced on-chain)
npm run payguard -- pay --to 0xRecipient --amount 0.01 --memo "API subscription" -o json
```

## Exit Codes

- `0` success
- `1` configuration or runtime error
- `2` payment rejected by policy (this is the guardrail working, not a bug)

## Credentials & Permissions

- The agent wallet key lives in `agent/.env` (`AGENT_PRIVATE_KEY`), never in chat.
- The agent wallet only needs a small amount of MNT for gas; spendable funds stay in the vault.
- Never display private keys. Never ask the user to paste keys in chat.

## Hard Constraints

1. **Never bypass a `rejected` result.** A rejection means the owner's on-chain policy
   forbids the payment. Do not retry with a different recipient or split amounts to
   evade limits.
2. **Always show full transaction hashes and addresses** — never truncate.
3. **Use `precheck` before `pay`** when planning multi-step work, so doomed payments
   are caught before spending gas.
4. **Respect `paused: true`** in status output: the owner has suspended the agent.
