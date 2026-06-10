import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { policyVaultAbi } from "../abi.js";
import type {
  Address,
  ExecuteOptions,
  PayGuardConfig,
  PaymentResult,
  PaymentTask,
  PrecheckResult,
} from "./types.js";

const EXPLORER_URL = "https://sepolia.mantlescan.xyz";

function mantleSepoliaChain(rpcUrl: string): Chain {
  return defineChain({
    id: 5003,
    name: "Mantle Sepolia",
    nativeCurrency: { decimals: 18, name: "MNT", symbol: "MNT" },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: { name: "Mantle Sepolia Explorer", url: EXPLORER_URL },
    },
  });
}

/** Maps contract custom error names to the same reason codes used by isAllowed. */
const REVERT_REASONS: Record<string, string> = {
  NotAgent: "NOT_AGENT",
  AgentPausedError: "PAUSED",
  AgentRevokedError: "REVOKED",
  ActionNotAllowed: "ACTION_DISABLED",
  RecipientNotWhitelisted: "NOT_WHITELISTED",
  ExceedsMaxPerTx: "EXCEEDS_PER_TX",
  ExceedsDailyLimit: "EXCEEDS_DAILY",
  TransferFailed: "TRANSFER_FAILED",
  InsufficientBalance: "INSUFFICIENT_BALANCE",
};

function parseRevertReason(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      return REVERT_REASONS[revert.data.errorName] ?? revert.data.errorName;
    }
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * PayGuardClient is the integration surface for agent runtimes.
 *
 * The agent signs with its own wallet and can only move funds through the
 * PolicyVault's guarded interface. Final policy enforcement always happens
 * on-chain; the precheck here only saves gas on doomed transactions.
 */
export class PayGuardClient {
  readonly vaultAddress: Address;
  readonly agentAddress: Address;

  private readonly account: Account;
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;

  constructor(config: PayGuardConfig) {
    const chain = mantleSepoliaChain(config.rpcUrl);
    this.account = privateKeyToAccount(config.agentPrivateKey);
    this.agentAddress = this.account.address;
    this.vaultAddress = config.vaultAddress;
    this.publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl),
    });
  }

  /** Off-chain policy precheck via the vault's isAllowedFor view. */
  async precheck(task: PaymentTask): Promise<PrecheckResult> {
    const [allowed, reason] = await this.publicClient.readContract({
      address: this.vaultAddress,
      abi: policyVaultAbi,
      functionName: "isAllowedFor",
      args: [this.agentAddress, task.to, parseEther(task.amount)],
    });
    return { allowed, reason };
  }

  /**
   * Execute a guarded payment. Returns a structured result instead of throwing
   * so callers (CLI, LLM agents, skills) can render outcomes uniformly.
   */
  async executePayment(task: PaymentTask, options: ExecuteOptions = {}): Promise<PaymentResult> {
    if (!options.skipPrecheck) {
      const { allowed, reason } = await this.precheck(task);
      if (!allowed) {
        return { status: "rejected", rejection: { stage: "precheck", reason } };
      }
    }

    const amount = parseEther(task.amount);
    const memo = task.memo ?? "agent payment";

    let txHash: `0x${string}`;
    try {
      txHash = await this.walletClient.writeContract({
        chain: this.walletClient.chain,
        account: this.account,
        address: this.vaultAddress,
        abi: policyVaultAbi,
        functionName: "executePayment",
        args: [task.to, amount, memo],
        // Gas estimation reverts for doomed transactions, which would prevent
        // them from ever reaching the chain. When the caller explicitly skips
        // the precheck, pin a gas limit so the on-chain revert is recorded as
        // public evidence that enforcement lives in the contract.
        ...(options.skipPrecheck ? { gas: 10_000_000n } : {}),
      });
    } catch (error) {
      // Rejected at simulation/submission time: the contract refused it.
      return {
        status: "rejected",
        rejection: { stage: "onchain", reason: parseRevertReason(error) },
      };
    }

    const explorerUrl = `${EXPLORER_URL}/tx/${txHash}`;
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      return {
        status: "rejected",
        rejection: { stage: "onchain", reason: "REVERTED" },
        txHash,
        explorerUrl,
      };
    }

    return { status: "success", txHash, explorerUrl, receiptStatus: receipt.status };
  }

  /** Current vault policy, for display or agent self-awareness. */
  async getPolicy() {
    return this.publicClient.readContract({
      address: this.vaultAddress,
      abi: policyVaultAbi,
      functionName: "getPolicy",
    });
  }

  /** Full vault status: policy, today's spend and vault balance. */
  async getStatus() {
    const [policy, dailySpent, balanceWei] = await Promise.all([
      this.getPolicy(),
      this.publicClient.readContract({
        address: this.vaultAddress,
        abi: policyVaultAbi,
        functionName: "getDailySpent",
      }),
      this.publicClient.getBalance({ address: this.vaultAddress }),
    ]);

    return {
      policy,
      dailySpent: { day: dailySpent[0], spent: dailySpent[1] },
      balanceWei,
    };
  }
}
