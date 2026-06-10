import { formatEther, parseEther } from "viem";
import { PayGuardClient } from "./sdk/PayGuardClient.js";
import { readArg, requireAddress, requireEnv } from "./config.js";

async function main() {
  const toArg = readArg("--to");
  const amountArg = readArg("--amount");
  const memo = readArg("--memo") ?? "agent payment";
  const force = process.argv.includes("--force");

  if (!toArg || !amountArg) {
    throw new Error(
      "Usage: npm run agent:pay -- --to 0xRecipient --amount 0.01 --memo \"demo payment\" [--force]",
    );
  }

  const rawPrivateKey = requireEnv("AGENT_PRIVATE_KEY");
  const agentPrivateKey = (
    rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`
  ) as `0x${string}`;

  const payguard = new PayGuardClient({
    rpcUrl: process.env.MANTLE_SEPOLIA_RPC ?? "https://rpc.sepolia.mantle.xyz",
    vaultAddress: requireAddress(requireEnv("VAULT_ADDRESS"), "VAULT_ADDRESS"),
    agentPrivateKey,
  });

  const task = { to: requireAddress(toArg, "--to"), amount: amountArg, memo };

  console.log("Agent PayGuard task");
  console.log("Agent:", payguard.agentAddress);
  console.log("Vault:", payguard.vaultAddress);
  console.log("Recipient:", task.to);
  console.log("Amount:", `${formatEther(parseEther(task.amount))} MNT`);
  console.log("Memo:", task.memo);

  if (!force) {
    const { allowed, reason } = await payguard.precheck(task);
    console.log("Policy precheck:", allowed ? "ALLOW" : `REJECT (${reason})`);

    if (!allowed) {
      console.log(`Agent action rejected by PayGuard policy: ${reason}`);
      console.log(
        "Transaction not sent. Use --force only if you intentionally want to record an on-chain revert.",
      );
      return;
    }
  } else {
    console.log("Policy precheck: SKIPPED (--force), submitting directly to the contract");
  }

  const result = await payguard.executePayment(task, { skipPrecheck: force });

  if (result.status === "success") {
    console.log("Transaction sent:", result.txHash);
    console.log("Explorer:", result.explorerUrl);
    console.log("Transaction status:", result.receiptStatus);
    return;
  }

  console.error(`Agent action rejected by PayGuard (${result.rejection.stage}):`);
  console.error(result.rejection.reason);
  if (result.txHash) {
    console.error("On-chain revert evidence:", result.explorerUrl);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
