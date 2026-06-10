/**
 * PayGuard Agent Skill CLI.
 *
 * OpenClaw / Byreal-Skills-style entrypoint: every command supports `-o json`
 * for structured output so an LLM agent can discover and call capabilities.
 * It is a thin wrapper around PayGuardClient — all enforcement is on-chain.
 *
 *   payguard status              [-o json]
 *   payguard precheck --to 0x.. --amount 0.01
 *   payguard pay --to 0x.. --amount 0.01 --memo "..."  [-o json]
 *   payguard catalog
 */
import { formatEther } from "viem";
import { PayGuardClient } from "./sdk/PayGuardClient.js";
import { readArg, requireAddress, requireEnv } from "./config.js";

type Json = Record<string, unknown>;

const CATALOG = {
  skill: "guarded_mnt_payment",
  description:
    "Execute native MNT payments on Mantle through a PolicyVault guardrail. " +
    "Owner-defined per-tx limit, daily limit and recipient whitelist are enforced on-chain.",
  capabilities: [
    { id: "status", description: "Read vault policy, today's spend and balance", write: false },
    { id: "precheck", description: "Check whether a payment would be allowed (no tx)", write: false, params: ["to", "amount"] },
    { id: "pay", description: "Execute a guarded payment", write: true, params: ["to", "amount", "memo"] },
  ],
} as const;

function wantJson(): boolean {
  const i = process.argv.indexOf("-o");
  return process.argv.includes("--json") || (i !== -1 && process.argv[i + 1] === "json");
}

function emit(json: boolean, structured: Json, human: () => void): void {
  if (json) {
    console.log(JSON.stringify(structured, null, 2));
  } else {
    human();
  }
}

function buildClient(): PayGuardClient {
  const rawKey = requireEnv("AGENT_PRIVATE_KEY");
  return new PayGuardClient({
    rpcUrl: process.env.MANTLE_SEPOLIA_RPC ?? "https://rpc.sepolia.mantle.xyz",
    vaultAddress: requireAddress(requireEnv("VAULT_ADDRESS"), "VAULT_ADDRESS"),
    agentPrivateKey: (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`,
  });
}

async function cmdStatus(json: boolean) {
  const client = buildClient();
  const { policy, dailySpent, balanceWei } = await client.getStatus();
  const structured: Json = {
    vault: client.vaultAddress,
    agent: client.agentAddress,
    owner: policy.owner,
    maxPerTxMnt: formatEther(policy.maxPerTx),
    dailyLimitMnt: formatEther(policy.dailyLimit),
    todaySpentMnt: formatEther(dailySpent.spent),
    balanceMnt: formatEther(balanceWei),
    paused: policy.paused,
    revoked: policy.revoked,
  };
  emit(json, structured, () => {
    console.log("PayGuard vault status");
    console.log("  vault:       ", structured.vault);
    console.log("  agent:       ", structured.agent);
    console.log("  max per tx:  ", `${structured.maxPerTxMnt} MNT`);
    console.log("  daily limit: ", `${structured.dailyLimitMnt} MNT`);
    console.log("  today spent: ", `${structured.todaySpentMnt} MNT`);
    console.log("  balance:     ", `${structured.balanceMnt} MNT`);
    console.log("  paused:      ", structured.paused);
  });
}

async function cmdPrecheck(json: boolean) {
  const client = buildClient();
  const to = requireAddress(requireEnv2("--to"), "--to");
  const amount = requireEnv2("--amount");
  const result = await client.precheck({ to, amount });
  emit(json, { ...result, to, amount }, () => {
    console.log(`Precheck ${to} ${amount} MNT: ${result.allowed ? "ALLOW" : `REJECT (${result.reason})`}`);
  });
  if (!result.allowed) process.exitCode = 2;
}

async function cmdPay(json: boolean) {
  const client = buildClient();
  const to = requireAddress(requireEnv2("--to"), "--to");
  const amount = requireEnv2("--amount");
  const memo = readArg("--memo") ?? "agent payment";
  const result = await client.executePayment({ to, amount, memo });

  if (result.status === "success") {
    emit(json, { status: "success", txid: result.txHash, explorer: result.explorerUrl, to, amount, memo }, () => {
      console.log("Payment executed");
      console.log("  txid:", result.txHash);
      console.log("  explorer:", result.explorerUrl);
    });
    return;
  }

  emit(json, { status: "rejected", stage: result.rejection.stage, reason: result.rejection.reason, to, amount }, () => {
    console.log(`Payment blocked by PayGuard (${result.rejection.stage}): ${result.rejection.reason}`);
  });
  process.exitCode = 2;
}

/** Required CLI flag value. */
function requireEnv2(flag: string): string {
  const value = readArg(flag);
  if (!value) throw new Error(`Missing required flag: ${flag}`);
  return value;
}

async function main() {
  const command = process.argv[2];
  const json = wantJson();

  switch (command) {
    case "status":
      return cmdStatus(json);
    case "precheck":
      return cmdPrecheck(json);
    case "pay":
      return cmdPay(json);
    case "catalog":
      console.log(JSON.stringify(CATALOG, null, 2));
      return;
    default:
      console.log("Usage: payguard <status|precheck|pay|catalog> [flags] [-o json]");
      console.log("  precheck --to 0x.. --amount 0.01");
      console.log("  pay --to 0x.. --amount 0.01 --memo \"...\"");
      if (command && command !== "help" && command !== "--help") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
