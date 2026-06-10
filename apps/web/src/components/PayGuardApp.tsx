"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { policyVaultAbi } from "@/lib/abi";
import { explorerAddressUrl, explorerTxUrl, mantleSepolia } from "@/lib/chain";
import { formatMnt, shortAddress } from "@/lib/format";

type PaymentEventRow = {
  txHash: string;
  blockNumber: bigint;
  timestamp?: bigint;
  agent: string;
  to: string;
  amount: bigint;
  day: bigint;
  dailySpentAfter: bigint;
  memo: string;
};

type WriteResult = {
  type: "success" | "error" | "info";
  message: string;
};

const DEFAULT_VAULT_ADDRESS = "0xD87aDfa5E4b9d42c543233500464bE08369810CA";
const DEFAULT_AGENT_ADDRESS = "0x8114D2D2D34F127741BC45A533EEf9D190F4dD43";
const DEFAULT_RECIPIENT_ADDRESS = "0x7024dA0eA6885441C4567E3CE92Be7CFcec2c9E4";

export function PayGuardApp() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: mantleSepolia.id });
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();

  const [vaultInput, setVaultInput] = useState(DEFAULT_VAULT_ADDRESS);
  const [agentInput, setAgentInput] = useState(DEFAULT_AGENT_ADDRESS);
  const [maxPerTxInput, setMaxPerTxInput] = useState("1");
  const [dailyLimitInput, setDailyLimitInput] = useState("10");
  const [whitelistInput, setWhitelistInput] = useState(DEFAULT_RECIPIENT_ADDRESS);
  const [fundAmountInput, setFundAmountInput] = useState("5");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("1");
  const [simRecipientInput, setSimRecipientInput] = useState(DEFAULT_RECIPIENT_ADDRESS);
  const [simAmountInput, setSimAmountInput] = useState("0.01");
  const [simMemoInput, setSimMemoInput] = useState("demo payment");
  const [precheckResult, setPrecheckResult] = useState<WriteResult | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [lastHash, setLastHash] = useState<`0x${string}` | undefined>();
  const [events, setEvents] = useState<PaymentEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const vaultAddress = useMemo(() => {
    return isAddress(vaultInput) ? vaultInput : undefined;
  }, [vaultInput]);

  const {
    data: policy,
    refetch: refetchPolicy,
    isLoading: isPolicyLoading,
  } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "getPolicy",
    query: {
      enabled: Boolean(vaultAddress),
    },
  });

  const { data: dailySpent, refetch: refetchDailySpent } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "getDailySpent",
    query: {
      enabled: Boolean(vaultAddress),
    },
  });

  const { data: paymentActionAllowed, refetch: refetchAction } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "allowedActions",
    args: [0],
    query: {
      enabled: Boolean(vaultAddress),
    },
  });

  const { data: whitelistStatus, refetch: refetchWhitelist } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "whitelistedRecipients",
    args: isAddress(whitelistInput) ? [whitelistInput] : undefined,
    query: {
      enabled: Boolean(vaultAddress && isAddress(whitelistInput)),
    },
  });

  const { data: vaultBalance, refetch: refetchBalance } = useBalance({
    address: vaultAddress,
    chainId: mantleSepolia.id,
    query: {
      enabled: Boolean(vaultAddress),
    },
  });

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: lastHash,
    chainId: mantleSepolia.id,
  });

  const wrongNetwork = isConnected && chainId !== mantleSepolia.id;
  const isBusy = isWriting || isSending || isConnecting;

  const refreshReads = useCallback(async () => {
    await Promise.all([
      refetchPolicy(),
      refetchDailySpent(),
      refetchAction(),
      refetchWhitelist(),
      refetchBalance(),
    ]);
  }, [refetchAction, refetchBalance, refetchDailySpent, refetchPolicy, refetchWhitelist]);

  const loadEvents = useCallback(async () => {
    if (!publicClient || !vaultAddress) return;
    setEventsLoading(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const eventWindow = BigInt(5000);
      const fromBlock = latestBlock > eventWindow ? latestBlock - eventWindow : BigInt(0);
      const logs = await publicClient.getContractEvents({
        address: vaultAddress,
        abi: policyVaultAbi,
        eventName: "PaymentExecuted",
        fromBlock,
        toBlock: "latest",
      });

      const rows = await Promise.all(
        logs.map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const args = log.args as {
            agent?: string;
            to?: string;
            amount?: bigint;
            day?: bigint;
            dailySpentAfter?: bigint;
            memo?: string;
          };

          return {
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
            agent: args.agent ?? "-",
            to: args.to ?? "-",
            amount: args.amount ?? BigInt(0),
            day: args.day ?? BigInt(0),
            dailySpentAfter: args.dailySpentAfter ?? BigInt(0),
            memo: args.memo ?? "",
          };
        }),
      );

      setEvents(rows.reverse());
    } catch (error) {
      setWriteResult({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setEventsLoading(false);
    }
  }, [publicClient, vaultAddress]);

  useEffect(() => {
    if (txConfirmed) {
      void refreshReads();
      void loadEvents();
    }
  }, [loadEvents, refreshReads, txConfirmed]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  async function runWrite(label: string, action: () => Promise<`0x${string}`>) {
    setWriteResult({ type: "info", message: `${label} pending...` });
    try {
      const hash = await action();
      setLastHash(hash);
      setWriteResult({
        type: "success",
        message: `${label} submitted: ${hash}`,
      });
    } catch (error) {
      setWriteResult({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function setAgent() {
    if (!vaultAddress || !isAddress(agentInput)) return;
    await runWrite("Set agent", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "setAgent",
        args: [agentInput],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function setLimits() {
    if (!vaultAddress) return;
    await runWrite("Set limits", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "setLimits",
        args: [parseEther(maxPerTxInput), parseEther(dailyLimitInput)],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function setWhitelist(allowed: boolean) {
    if (!vaultAddress || !isAddress(whitelistInput)) return;
    await runWrite(allowed ? "Add whitelist" : "Remove whitelist", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "setWhitelist",
        args: [whitelistInput, allowed],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function setPaymentAction(allowed: boolean) {
    if (!vaultAddress) return;
    await runWrite(allowed ? "Enable payment action" : "Disable payment action", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "setAllowedAction",
        args: [0, allowed],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function pauseAgent(paused: boolean) {
    if (!vaultAddress) return;
    await runWrite(paused ? "Pause agent" : "Resume agent", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "pauseAgent",
        args: [paused],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function revokeAgent() {
    if (!vaultAddress) return;
    await runWrite("Revoke agent", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "revokeAgent",
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function fundVault() {
    if (!vaultAddress) return;
    await runWrite("Fund vault", () =>
      sendTransactionAsync({
        to: vaultAddress,
        value: parseEther(fundAmountInput),
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function ownerWithdraw() {
    if (!vaultAddress || !address) return;
    await runWrite("Owner withdraw", () =>
      writeContractAsync({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "ownerWithdraw",
        args: [address, parseEther(withdrawAmountInput)],
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function runPrecheck() {
    if (!publicClient || !vaultAddress || !isAddress(simRecipientInput)) return;
    setPrecheckResult({ type: "info", message: "Checking policy..." });
    try {
      const agent = policy?.agent;
      if (!agent || !isAddress(agent)) {
        setPrecheckResult({ type: "error", message: "Policy agent is not loaded yet." });
        return;
      }

      // v1.1: isAllowedFor takes the agent explicitly, so any wallet can simulate.
      const [allowed, reason] = await publicClient.readContract({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "isAllowedFor",
        args: [agent, simRecipientInput, parseEther(simAmountInput)],
      });

      setPrecheckResult({
        type: allowed ? "success" : "error",
        message: allowed ? "Policy allows this Agent action." : `Rejected by policy: ${reason}`,
      });
    } catch (error) {
      setPrecheckResult({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-ink">Agent PayGuard</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              On-chain spending policy layer for AI agents on Mantle. Agents can spend, but only inside owner-defined limits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isConnected ? (
              <>
                <span className="rounded border border-line bg-panel px-3 py-2 text-sm">
                  {shortAddress(address)}
                </span>
                {wrongNetwork ? (
                  <button className="btn-primary" onClick={() => switchChain({ chainId: mantleSepolia.id })}>
                    Switch to Mantle
                  </button>
                ) : (
                  <span className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    Mantle Sepolia
                  </span>
                )}
                <button className="btn-secondary" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                disabled={!connectors[0] || isConnecting}
                onClick={() => connect({ connector: connectors[0], chainId: mantleSepolia.id })}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[380px_1fr]">
        <section className="panel">
          <h2 className="section-title">Vault Setup</h2>
          <Field label="PolicyVault address">
            <input
              className="input"
              placeholder="0x..."
              value={vaultInput}
              onChange={(event) => setVaultInput(event.target.value)}
            />
          </Field>
          <Field label="Fund amount">
            <div className="flex gap-2">
              <input
                className="input"
                value={fundAmountInput}
                onChange={(event) => setFundAmountInput(event.target.value)}
              />
              <button className="btn-secondary shrink-0" disabled={!vaultAddress || isBusy} onClick={fundVault}>
                Fund
              </button>
            </div>
          </Field>
          <Field label="Owner withdraw (to connected wallet)">
            <div className="flex gap-2">
              <input
                className="input"
                value={withdrawAmountInput}
                onChange={(event) => setWithdrawAmountInput(event.target.value)}
              />
              <button
                className="btn-secondary shrink-0"
                disabled={!vaultAddress || !isConnected || isBusy}
                onClick={ownerWithdraw}
              >
                Withdraw
              </button>
            </div>
            <span className="mt-1 block text-xs text-muted">
              Policy limits constrain the agent. The owner can always reclaim funds.
            </span>
          </Field>
          <p className="mt-3 text-xs text-muted">
            MVP uses a deployed PolicyVault address. Create/deploy UI can be added after the core demo is stable.
          </p>
        </section>

        <section className="panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Dashboard</h2>
              <p className="text-sm text-muted">Current policy, budget and Agent status.</p>
            </div>
            <button className="btn-secondary" disabled={!vaultAddress} onClick={() => void refreshReads()}>
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Metric label="Vault" value={vaultAddress ? shortAddress(vaultAddress) : "Not set"} href={vaultAddress ? explorerAddressUrl(vaultAddress) : undefined} />
            <Metric label="Owner" value={policy ? shortAddress(policy.owner) : "-"} />
            <Metric label="Agent" value={policy ? shortAddress(policy.agent) : "-"} />
            <Metric label="Balance" value={vaultBalance ? `${Number(vaultBalance.formatted).toLocaleString()} MNT` : "-"} />
            <Metric label="Max per tx" value={formatMnt(policy?.maxPerTx)} />
            <Metric label="Daily limit" value={formatMnt(policy?.dailyLimit)} />
            <Metric label="Today spent" value={formatMnt(dailySpent?.[1])} />
            <Metric label="Payment action" value={paymentActionAllowed ? "Enabled" : "Disabled"} />
            <Metric label="Agent status" value={policy?.revoked ? "Revoked" : policy?.paused ? "Paused" : "Active"} />
          </div>
          {isPolicyLoading && <p className="mt-3 text-sm text-muted">Loading policy...</p>}
        </section>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 pb-5 lg:grid-cols-2">
        <section className="panel">
          <h2 className="section-title">Configure Policy</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Agent address">
              <div className="flex gap-2">
                <input className="input" placeholder="0xAgent" value={agentInput} onChange={(event) => setAgentInput(event.target.value)} />
                <button className="btn-secondary shrink-0" disabled={!vaultAddress || !isAddress(agentInput) || isBusy} onClick={setAgent}>
                  Set
                </button>
              </div>
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Max per transaction">
                <input className="input" value={maxPerTxInput} onChange={(event) => setMaxPerTxInput(event.target.value)} />
              </Field>
              <Field label="Daily limit">
                <input className="input" value={dailyLimitInput} onChange={(event) => setDailyLimitInput(event.target.value)} />
              </Field>
            </div>
            <button className="btn-secondary w-fit" disabled={!vaultAddress || isBusy} onClick={setLimits}>
              Save limits
            </button>

            <Field label="Whitelist recipient">
              <div className="flex flex-wrap gap-2">
                <input className="input min-w-0 flex-1" placeholder="0xRecipient" value={whitelistInput} onChange={(event) => setWhitelistInput(event.target.value)} />
                <button className="btn-secondary" disabled={!vaultAddress || !isAddress(whitelistInput) || isBusy} onClick={() => setWhitelist(true)}>
                  Add
                </button>
                <button className="btn-secondary" disabled={!vaultAddress || !isAddress(whitelistInput) || isBusy} onClick={() => setWhitelist(false)}>
                  Remove
                </button>
              </div>
              {isAddress(whitelistInput) && (
                <span className="mt-1 block text-xs text-muted">
                  Current status: {whitelistStatus ? "Whitelisted" : "Not whitelisted"}
                </span>
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={!vaultAddress || isBusy} onClick={() => setPaymentAction(true)}>
                Enable payment
              </button>
              <button className="btn-secondary" disabled={!vaultAddress || isBusy} onClick={() => setPaymentAction(false)}>
                Disable payment
              </button>
              <button className="btn-secondary" disabled={!vaultAddress || isBusy} onClick={() => pauseAgent(true)}>
                Pause agent
              </button>
              <button className="btn-secondary" disabled={!vaultAddress || isBusy} onClick={() => pauseAgent(false)}>
                Resume agent
              </button>
              <button className="btn-danger" disabled={!vaultAddress || isBusy} onClick={revokeAgent}>
                Revoke agent
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Agent Action Simulator</h2>
          <p className="mt-1 text-sm text-muted">
            The browser only prechecks policy. Real execution should use the Agent CLI with the Agent wallet.
          </p>
          <div className="mt-4 grid gap-4">
            <Field label="Recipient">
              <input className="input" placeholder="0xRecipient" value={simRecipientInput} onChange={(event) => setSimRecipientInput(event.target.value)} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Amount">
                <input className="input" value={simAmountInput} onChange={(event) => setSimAmountInput(event.target.value)} />
              </Field>
              <Field label="Memo">
                <input className="input" value={simMemoInput} onChange={(event) => setSimMemoInput(event.target.value)} />
              </Field>
            </div>
            <button className="btn-primary w-fit" disabled={!vaultAddress || !isAddress(simRecipientInput)} onClick={runPrecheck}>
              Policy precheck
            </button>

            <div className="rounded border border-line bg-panel p-3 font-mono text-xs">
              <div>Agent CLI command:</div>
              <div className="mt-2 break-all">
                npm run agent:pay -- --to {simRecipientInput || "0xRecipient"} --amount {simAmountInput || "0.01"} --memo &quot;{simMemoInput || "demo payment"}&quot;
              </div>
            </div>
            {precheckResult && <Notice result={precheckResult} />}
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-8">
        <section className="panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Receipt / Explorer</h2>
              <p className="text-sm text-muted">Successful Agent payments emitted by PolicyVault.</p>
            </div>
            <button className="btn-secondary" disabled={!vaultAddress || eventsLoading} onClick={() => void loadEvents()}>
              {eventsLoading ? "Loading..." : "Load events"}
            </button>
          </div>
          {writeResult && <div className="mt-4"><Notice result={writeResult} /></div>}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase text-muted">
                  <th className="py-2 pr-4">Tx</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4">Recipient</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Daily spent</th>
                  <th className="py-2 pr-4">Memo</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td className="py-4 text-muted" colSpan={7}>
                      No payment events loaded yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={`${event.txHash}-${event.blockNumber.toString()}`} className="border-b border-line">
                      <td className="py-3 pr-4">
                        <a className="link" href={explorerTxUrl(event.txHash)} target="_blank" rel="noreferrer">
                          {shortAddress(event.txHash)}
                        </a>
                      </td>
                      <td className="py-3 pr-4">{event.timestamp ? new Date(Number(event.timestamp) * 1000).toLocaleString() : "-"}</td>
                      <td className="py-3 pr-4">{shortAddress(event.agent)}</td>
                      <td className="py-3 pr-4">{shortAddress(event.to)}</td>
                      <td className="py-3 pr-4">{formatMnt(event.amount)}</td>
                      <td className="py-3 pr-4">{formatMnt(event.dailySpentAfter)}</td>
                      <td className="py-3 pr-4">{event.memo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded border border-line bg-panel p-3">
      <div className="text-xs uppercase text-muted">{label}</div>
      {href ? (
        <a className="link mt-1 block text-sm font-medium" href={href} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <div className="mt-1 text-sm font-medium text-ink">{value}</div>
      )}
    </div>
  );
}

function Notice({ result }: { result: WriteResult }) {
  const className =
    result.type === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : result.type === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded border px-3 py-2 text-sm ${className}`}>
      {result.message}
    </div>
  );
}
