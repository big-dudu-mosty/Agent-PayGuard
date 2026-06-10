/**
 * LLM Demo Agent: receives a natural-language task, parses it into a payment
 * with an LLM, and executes it through the PayGuard SDK.
 *
 * The LLM only parses. Final authorization always happens on-chain in the
 * PolicyVault — that is exactly what the prompt-injection demo proves.
 *
 * Usage:
 *   npm run agent:demo -- --task "Pay 0.01 MNT to 0xRecipient for API subscription"
 *   npm run agent:demo -- --task-file ./samples/injection-invoice.txt
 *   # Fallback without an LLM key (structured input, no parsing):
 *   npm run agent:demo -- --to 0xRecipient --amount 0.01 --memo "demo"
 */
import { readFileSync } from "node:fs";
import { PayGuardClient } from "./sdk/PayGuardClient.js";
import { readArg, requireAddress, requireEnv } from "./config.js";
import { llmConfigFromEnv, parseTaskWithLlm, type ParsedPayment } from "./llm.js";

function loadTask(): string | undefined {
  const inline = readArg("--task");
  if (inline) return inline;
  const file = readArg("--task-file");
  if (file) return readFileSync(file, "utf8");
  return undefined;
}

function structuredFallback(): ParsedPayment | undefined {
  const to = readArg("--to");
  const amount = readArg("--amount");
  if (!to || !amount) return undefined;
  return {
    action: "PAYMENT",
    to: requireAddress(to, "--to"),
    amount,
    memo: readArg("--memo") ?? "agent payment",
  };
}

async function main() {
  const task = loadTask();
  const fallback = structuredFallback();

  if (!task && !fallback) {
    throw new Error(
      'Usage: npm run agent:demo -- --task "Pay 0.01 MNT to 0x... for API subscription"\n' +
        "       npm run agent:demo -- --task-file ./samples/injection-invoice.txt\n" +
        "       npm run agent:demo -- --to 0x... --amount 0.01 --memo \"demo\"",
    );
  }

  const rawPrivateKey = requireEnv("AGENT_PRIVATE_KEY");
  const payguard = new PayGuardClient({
    rpcUrl: process.env.MANTLE_SEPOLIA_RPC ?? "https://rpc.sepolia.mantle.xyz",
    vaultAddress: requireAddress(requireEnv("VAULT_ADDRESS"), "VAULT_ADDRESS"),
    agentPrivateKey: (rawPrivateKey.startsWith("0x")
      ? rawPrivateKey
      : `0x${rawPrivateKey}`) as `0x${string}`,
  });

  console.log("=== Agent PayGuard / LLM Demo Agent ===");
  console.log("Agent wallet:", payguard.agentAddress);
  console.log("PolicyVault: ", payguard.vaultAddress);
  console.log("");

  let payment: ParsedPayment;

  if (task) {
    console.log("[1/3] Task received:");
    console.log(indent(task));
    console.log("");

    const llm = llmConfigFromEnv();
    if (llm) {
      console.log(`[2/3] Parsing task with LLM (${llm.model})...`);
      try {
        payment = await parseTaskWithLlm(llm, task);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("LLM parsing failed:", message);
        if (!fallback) {
          console.error("No structured fallback provided (--to/--amount). Aborting.");
          process.exitCode = 1;
          return;
        }
        console.log("Falling back to structured input.");
        payment = fallback;
      }
    } else if (fallback) {
      console.log("[2/3] No LLM_API_KEY set, using structured input.");
      payment = fallback;
    } else {
      throw new Error("Set LLM_API_KEY in agent/.env, or pass --to/--amount as fallback.");
    }
  } else {
    console.log("[1/3] Structured task (no LLM parsing).");
    payment = fallback!;
  }

  if (payment.action === "NONE") {
    console.log("LLM found no payment instruction in the task. Nothing to execute.");
    return;
  }

  console.log("      Agent intends to pay:");
  console.log(`        to:     ${payment.to}`);
  console.log(`        amount: ${payment.amount} MNT`);
  console.log(`        memo:   ${payment.memo}`);
  console.log("");

  console.log("[3/3] Executing through PayGuard (final check is on-chain)...");
  const result = await payguard.executePayment({
    to: payment.to as `0x${string}`,
    amount: payment.amount,
    memo: payment.memo,
  });

  console.log("");
  if (result.status === "success") {
    console.log("RESULT: PAYMENT EXECUTED");
    console.log("  tx:      ", result.txHash);
    console.log("  explorer:", result.explorerUrl);
  } else {
    console.log("RESULT: BLOCKED BY PAYGUARD");
    console.log(`  stage:  ${result.rejection.stage}`);
    console.log(`  reason: ${result.rejection.reason}`);
    console.log("");
    console.log("  The model can be fooled. The chain cannot.");
    process.exitCode = 1;
  }
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
