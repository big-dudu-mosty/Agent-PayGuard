export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export interface PayGuardConfig {
  /** Mantle Sepolia RPC endpoint. */
  rpcUrl: string;
  /** Deployed PolicyVault address. */
  vaultAddress: Address;
  /** Private key of the agent wallet. Never the owner key. */
  agentPrivateKey: Hex;
}

export interface PaymentTask {
  to: Address;
  /** Amount in MNT, e.g. "0.01". */
  amount: string;
  memo?: string;
}

export interface PrecheckResult {
  allowed: boolean;
  /** "OK" or a policy reason such as "EXCEEDS_PER_TX", "NOT_WHITELISTED". */
  reason: string;
}

export interface PolicyRejection {
  /** Where the rejection happened: SDK precheck (off-chain) or contract revert (on-chain). */
  stage: "precheck" | "onchain";
  reason: string;
}

export type PaymentResult =
  | {
      status: "success";
      txHash: Hex;
      explorerUrl: string;
      receiptStatus: "success" | "reverted";
    }
  | {
      status: "rejected";
      rejection: PolicyRejection;
      /** Present when an on-chain rejection still produced a transaction (e.g. forced revert). */
      txHash?: Hex;
      explorerUrl?: string;
    };

export interface ExecuteOptions {
  /**
   * Skip the off-chain precheck and submit the transaction directly.
   * Use only to demonstrate that enforcement lives in the contract, not in this SDK.
   */
  skipPrecheck?: boolean;
}
