"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clipboard,
  Code2,
  ExternalLink,
  FlaskConical,
  Gauge,
  Landmark,
  LockKeyhole,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Terminal,
  UserRound,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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

type View = "owner" | "developer" | "lab" | "activity";
type Language = "zh" | "en";

type PaymentEventRow = {
  txHash: string;
  blockNumber: bigint;
  timestamp?: bigint;
  agent: string;
  to: string;
  amount: bigint;
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
const DEPLOYMENT_BLOCK = 39754725n;
const EVENT_BLOCK_RANGE = 9_999n;

function wait(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

const COPY = {
  zh: {
    brandLine: "SAFE AGENT PAYMENTS",
    owner: "Owner",
    developer: "Developer",
    lab: "Agent Lab",
    activity: "Activity",
    connect: "连接钱包",
    disconnect: "断开连接",
    switchNetwork: "切换到 Mantle",
    ownerEyebrow: "OWNER CONTROL",
    ownerLive: "POLICY LIVE",
    ownerTitle: "让 Agent 执行支付，\n让规则始终掌控资金。",
    ownerDescription: "AIPay 将预算、白名单和暂停权限放在链上。Owner 只需设置边界，Agent 就能在边界内自动工作。",
    editPolicy: "编辑策略",
    viewActivity: "查看记录",
    setupPath: "使用路径",
    setupSteps: ["向 Vault 充值", "设置支付策略", "授权 Agent 执行"],
    runtime: "Agent Runtime",
    realtime: "实时状态",
    active: "运行中",
    paused: "已暂停",
    revoked: "已撤销",
    authorized: "已授权",
    paymentEnabled: "支付已开启",
    paymentDisabled: "支付已关闭",
    networkReady: "网络正常",
    vaultBalance: "Vault 余额",
    todaySpent: "今日已用",
    dailyLimit: "每日限额",
    perTxLimit: "单笔上限",
    policy: "当前策略",
    policyDescription: "Agent 的每笔付款都会经过以下规则检查。",
    agentAddress: "Agent 地址",
    whitelist: "白名单收款方",
    whitelistStatus: "当前地址状态",
    whitelisted: "已加入白名单",
    notWhitelisted: "未加入白名单",
    controls: "Agent 权限",
    pauseAgent: "暂停 Agent",
    resumeAgent: "恢复 Agent",
    revokeAgent: "撤销 Agent",
    enablePayment: "开启支付",
    disablePayment: "关闭支付",
    treasury: "Vault 资金",
    treasuryDescription: "充值可由任意钱包发起，提款仅限 Owner。",
    fundAmount: "充值金额",
    withdrawAmount: "提款金额",
    fund: "充值",
    withdraw: "提款",
    policyEditor: "策略设置",
    policyEditorDescription: "修改后需要 Owner 钱包签名并在 Mantle Sepolia 上确认。",
    setAgent: "设置 Agent",
    maxPerTransaction: "单笔最大金额",
    saveLimits: "保存限额",
    recipientAddress: "收款地址",
    addWhitelist: "添加白名单",
    removeWhitelist: "移除白名单",
    closeEditor: "收起设置",
    ownerRequired: "连接 Owner 钱包后才能修改策略。",
    developerEyebrow: "DEVELOPER ACCESS",
    developerTitle: "三步把受控支付\n接入你的 Agent。",
    developerDescription: "SDK 负责预检查与交易执行，PolicyVault 负责不可绕过的链上强制规则。",
    installSdk: "安装 SDK",
    configureAgent: "配置 Agent",
    executePayment: "执行受控支付",
    connection: "连接状态",
    connected: "已连接",
    vaultContract: "Vault 合约",
    sdkSurface: "SDK 能力",
    precheck: "付款预检查",
    guardedPayment: "受控付款",
    readableErrors: "可读拒绝原因",
    skillCli: "Agent Skill CLI",
    skillDescription: "为 Agent runtime 提供 JSON 输出和标准退出码。",
    copy: "复制",
    copied: "已复制",
    labEyebrow: "AGENT TEST SURFACE",
    labTitle: "先验证策略，\n再让 Agent 执行。",
    labDescription: "这里不会使用 Owner 钱包付款，只模拟 Agent 身份并读取链上 Policy。",
    taskInput: "付款任务",
    recipient: "收款地址",
    amount: "金额",
    memo: "备注",
    runPrecheck: "运行策略检查",
    checking: "检查中...",
    decision: "Policy Decision",
    waitingDecision: "输入任务后运行检查",
    allowed: "允许执行",
    rejected: "策略拒绝",
    identityCheck: "Agent 身份",
    whitelistCheck: "收款白名单",
    amountCheck: "单笔额度",
    budgetCheck: "每日预算",
    attackTest: "Prompt Injection 测试",
    attackDescription: "即使模型被诱导生成恶意付款，白名单和限额仍会在链上生效。",
    activityEyebrow: "ON-CHAIN RECEIPTS",
    activityTitle: "每一次成功执行，\n都有 Mantle 链上凭证。",
    activityDescription: "成功支付来自 PaymentExecuted 事件；被 SDK 预检查拒绝的任务不会伪装成链上记录。",
    refresh: "刷新",
    loading: "加载中...",
    time: "时间",
    agent: "Agent",
    amountLabel: "金额",
    dailySpent: "当日累计",
    tx: "交易",
    noEvents: "当前查询范围内没有支付记录。",
    activityUnavailable: "事件索引暂时不可用，请稍后刷新。",
    rejectedEvidence: "拒绝证据",
    rejectedEvidenceDescription: "即使跳过 SDK 预检查，违规交易仍会被 PolicyVault 在链上 revert。",
    exceededLimit: "超过单笔限额",
    outsideWhitelist: "非白名单收款方",
    setAgentAction: "设置 Agent",
    setLimitsAction: "设置限额",
    addWhitelistAction: "添加白名单",
    removeWhitelistAction: "移除白名单",
    enablePaymentAction: "开启支付权限",
    disablePaymentAction: "关闭支付权限",
    pauseAgentAction: "暂停 Agent",
    resumeAgentAction: "恢复 Agent",
    revokeAgentAction: "撤销 Agent",
    fundVaultAction: "Vault 充值",
    ownerWithdrawAction: "Owner 提款",
    pending: "等待钱包确认",
    submitted: "交易已提交",
    policyAgentMissing: "尚未读取到策略中的 Agent 地址。",
    policyAllows: "策略允许这笔付款。",
    policyRejects: "策略拒绝",
  },
  en: {
    brandLine: "SAFE AGENT PAYMENTS",
    owner: "Owner",
    developer: "Developer",
    lab: "Agent Lab",
    activity: "Activity",
    connect: "Connect wallet",
    disconnect: "Disconnect",
    switchNetwork: "Switch to Mantle",
    ownerEyebrow: "OWNER CONTROL",
    ownerLive: "POLICY LIVE",
    ownerTitle: "Let agents execute.\nKeep money inside policy.",
    ownerDescription: "AIPay puts budgets, recipient rules and emergency controls on-chain. Owners define the boundary; agents operate inside it.",
    editPolicy: "Edit policy",
    viewActivity: "View activity",
    setupPath: "Control path",
    setupSteps: ["Fund the Vault", "Define the policy", "Authorize the Agent"],
    runtime: "Agent Runtime",
    realtime: "Realtime status",
    active: "Active",
    paused: "Paused",
    revoked: "Revoked",
    authorized: "Authorized",
    paymentEnabled: "Payment enabled",
    paymentDisabled: "Payment disabled",
    networkReady: "Network ready",
    vaultBalance: "Vault balance",
    todaySpent: "Today spent",
    dailyLimit: "Daily limit",
    perTxLimit: "Per-tx limit",
    policy: "Current policy",
    policyDescription: "Every Agent payment is checked against these rules.",
    agentAddress: "Agent address",
    whitelist: "Whitelisted recipient",
    whitelistStatus: "Current address status",
    whitelisted: "Whitelisted",
    notWhitelisted: "Not whitelisted",
    controls: "Agent access",
    pauseAgent: "Pause Agent",
    resumeAgent: "Resume Agent",
    revokeAgent: "Revoke Agent",
    enablePayment: "Enable payment",
    disablePayment: "Disable payment",
    treasury: "Vault treasury",
    treasuryDescription: "Any wallet can fund the Vault. Only the Owner can withdraw.",
    fundAmount: "Fund amount",
    withdrawAmount: "Withdraw amount",
    fund: "Fund",
    withdraw: "Withdraw",
    policyEditor: "Policy settings",
    policyEditorDescription: "Changes require the Owner wallet and confirmation on Mantle Sepolia.",
    setAgent: "Set Agent",
    maxPerTransaction: "Max per transaction",
    saveLimits: "Save limits",
    recipientAddress: "Recipient address",
    addWhitelist: "Add whitelist",
    removeWhitelist: "Remove whitelist",
    closeEditor: "Close settings",
    ownerRequired: "Connect the Owner wallet to modify policy.",
    developerEyebrow: "DEVELOPER ACCESS",
    developerTitle: "Add guarded payments\nto any agent in three steps.",
    developerDescription: "The SDK handles prechecks and transaction execution. PolicyVault provides enforcement that client code cannot bypass.",
    installSdk: "Install SDK",
    configureAgent: "Configure Agent",
    executePayment: "Execute payment",
    connection: "Connection status",
    connected: "Connected",
    vaultContract: "Vault contract",
    sdkSurface: "SDK surface",
    precheck: "Payment precheck",
    guardedPayment: "Guarded payment",
    readableErrors: "Readable rejections",
    skillCli: "Agent Skill CLI",
    skillDescription: "Structured JSON output and standard exit codes for agent runtimes.",
    copy: "Copy",
    copied: "Copied",
    labEyebrow: "AGENT TEST SURFACE",
    labTitle: "Validate policy first.\nLet the Agent execute second.",
    labDescription: "This surface never pays with the Owner wallet. It simulates the Agent identity and reads the on-chain policy.",
    taskInput: "Payment task",
    recipient: "Recipient",
    amount: "Amount",
    memo: "Memo",
    runPrecheck: "Run policy check",
    checking: "Checking...",
    decision: "Policy Decision",
    waitingDecision: "Run a check to see the decision",
    allowed: "Allowed",
    rejected: "Rejected",
    identityCheck: "Agent identity",
    whitelistCheck: "Recipient whitelist",
    amountCheck: "Per-tx amount",
    budgetCheck: "Daily budget",
    attackTest: "Prompt injection test",
    attackDescription: "Even if the model creates a malicious payment, whitelist and budget rules still hold on-chain.",
    activityEyebrow: "ON-CHAIN RECEIPTS",
    activityTitle: "Every successful action\nleaves a Mantle receipt.",
    activityDescription: "Successful payments come from PaymentExecuted events. SDK precheck rejections are never presented as on-chain records.",
    refresh: "Refresh",
    loading: "Loading...",
    time: "Time",
    agent: "Agent",
    amountLabel: "Amount",
    dailySpent: "Daily spent",
    tx: "Transaction",
    noEvents: "No payment events found in the current query range.",
    activityUnavailable: "Event indexing is temporarily unavailable. Please retry.",
    rejectedEvidence: "Rejection evidence",
    rejectedEvidenceDescription: "Even when SDK prechecks are skipped, invalid transactions still revert inside PolicyVault.",
    exceededLimit: "Exceeds per-tx limit",
    outsideWhitelist: "Recipient not whitelisted",
    setAgentAction: "Set Agent",
    setLimitsAction: "Set limits",
    addWhitelistAction: "Add whitelist",
    removeWhitelistAction: "Remove whitelist",
    enablePaymentAction: "Enable payment",
    disablePaymentAction: "Disable payment",
    pauseAgentAction: "Pause Agent",
    resumeAgentAction: "Resume Agent",
    revokeAgentAction: "Revoke Agent",
    fundVaultAction: "Fund Vault",
    ownerWithdrawAction: "Owner withdraw",
    pending: "Waiting for wallet",
    submitted: "Transaction submitted",
    policyAgentMissing: "Policy Agent has not loaded yet.",
    policyAllows: "Policy allows this payment.",
    policyRejects: "Rejected by policy",
  },
} as const;

const SDK_SNIPPET = `const payguard = new PayGuardClient({
  rpcUrl,
  vaultAddress,
  agentPrivateKey,
});

const result = await payguard.executePayment({
  to: recipient,
  amount: "0.01",
  memo: "API subscription",
});`;

const CLI_SNIPPET = `npm run payguard -- precheck \\
  --to 0xRecipient \\
  --amount 0.01 \\
  -o json`;

const NAV_ITEMS: Array<{ id: View; icon: LucideIcon }> = [
  { id: "owner", icon: ShieldCheck },
  { id: "developer", icon: Code2 },
  { id: "lab", icon: FlaskConical },
  { id: "activity", icon: Activity },
];

export function PayGuardApp() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: mantleSepolia.id });
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { sendTransactionAsync, isPending: isSending } = useSendTransaction();

  const [view, setView] = useState<View>("owner");
  const [language, setLanguage] = useState<Language>("zh");
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [vaultInput] = useState(DEFAULT_VAULT_ADDRESS);
  const [agentInput, setAgentInput] = useState(DEFAULT_AGENT_ADDRESS);
  const [maxPerTxInput, setMaxPerTxInput] = useState("1");
  const [dailyLimitInput, setDailyLimitInput] = useState("10");
  const [whitelistInput, setWhitelistInput] = useState(DEFAULT_RECIPIENT_ADDRESS);
  const [fundAmountInput, setFundAmountInput] = useState("1");
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("0.5");
  const [simRecipientInput, setSimRecipientInput] = useState(DEFAULT_RECIPIENT_ADDRESS);
  const [simAmountInput, setSimAmountInput] = useState("0.01");
  const [simMemoInput, setSimMemoInput] = useState("API subscription");
  const [precheckResult, setPrecheckResult] = useState<WriteResult | null>(null);
  const [precheckReason, setPrecheckReason] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [lastHash, setLastHash] = useState<`0x${string}` | undefined>();
  const [events, setEvents] = useState<PaymentEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const eventsRequestInFlight = useRef(false);

  const t = COPY[language];
  const vaultAddress = isAddress(vaultInput) ? vaultInput : undefined;

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("aipay-language");
    if (savedLanguage === "zh" || savedLanguage === "en") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aipay-language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const {
    data: policy,
    refetch: refetchPolicy,
    isLoading: isPolicyLoading,
  } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "getPolicy",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: dailySpent, refetch: refetchDailySpent } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "getDailySpent",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: paymentActionAllowed, refetch: refetchAction } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "allowedActions",
    args: [0],
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: whitelistStatus, refetch: refetchWhitelist } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "whitelistedRecipients",
    args: isAddress(whitelistInput) ? [whitelistInput] : undefined,
    query: { enabled: Boolean(vaultAddress && isAddress(whitelistInput)) },
  });

  const { data: simWhitelistStatus } = useReadContract({
    address: vaultAddress,
    abi: policyVaultAbi,
    functionName: "whitelistedRecipients",
    args: isAddress(simRecipientInput) ? [simRecipientInput] : undefined,
    query: { enabled: Boolean(vaultAddress && isAddress(simRecipientInput)) },
  });

  const { data: vaultBalance, refetch: refetchBalance } = useBalance({
    address: vaultAddress,
    chainId: mantleSepolia.id,
    query: { enabled: Boolean(vaultAddress) },
  });

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: lastHash,
    chainId: mantleSepolia.id,
  });

  const wrongNetwork = isConnected && chainId !== mantleSepolia.id;
  const isBusy = isWriting || isSending || isConnecting;
  const isOwner = Boolean(address && policy?.owner && address.toLowerCase() === policy.owner.toLowerCase());
  const canManage = isOwner && !wrongNetwork && !isBusy;
  const agentState = policy?.revoked ? t.revoked : policy?.paused ? t.paused : t.active;
  const agentTone = policy?.revoked ? "danger" : policy?.paused ? "warning" : "success";

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
    if (!publicClient || !vaultAddress || eventsRequestInFlight.current) return;
    eventsRequestInFlight.current = true;
    setEventsLoading(true);
    setEventsError(false);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      if (latestBlock < DEPLOYMENT_BLOCK) {
        setEvents([]);
        return;
      }

      const firstToBlock =
        DEPLOYMENT_BLOCK + EVENT_BLOCK_RANGE < latestBlock
          ? DEPLOYMENT_BLOCK + EVENT_BLOCK_RANGE
          : latestBlock;
      let logs;
      try {
        logs = await publicClient.getContractEvents({
          address: vaultAddress,
          abi: policyVaultAbi,
          eventName: "PaymentExecuted",
          fromBlock: DEPLOYMENT_BLOCK,
          toBlock: firstToBlock,
        });
      } catch {
        await wait(1_000);
        logs = await publicClient.getContractEvents({
          address: vaultAddress,
          abi: policyVaultAbi,
          eventName: "PaymentExecuted",
          fromBlock: DEPLOYMENT_BLOCK,
          toBlock: firstToBlock,
        });
      }

      for (
        let fromBlock = firstToBlock + 1n;
        fromBlock <= latestBlock;
        fromBlock += EVENT_BLOCK_RANGE + 1n
      ) {
        await wait(250);
        const toBlock = fromBlock + EVENT_BLOCK_RANGE < latestBlock ? fromBlock + EVENT_BLOCK_RANGE : latestBlock;
        let chunk;
        try {
          chunk = await publicClient.getContractEvents({
            address: vaultAddress,
            abi: policyVaultAbi,
            eventName: "PaymentExecuted",
            fromBlock,
            toBlock,
          });
        } catch {
          await wait(1_000);
          chunk = await publicClient.getContractEvents({
            address: vaultAddress,
            abi: policyVaultAbi,
            eventName: "PaymentExecuted",
            fromBlock,
            toBlock,
          });
        }
        logs.push(...chunk);
      }

      const rows = await Promise.all(
        logs.map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const args = log.args as {
            agent?: string;
            to?: string;
            amount?: bigint;
            dailySpentAfter?: bigint;
            memo?: string;
          };
          return {
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
            agent: args.agent ?? "-",
            to: args.to ?? "-",
            amount: args.amount ?? 0n,
            dailySpentAfter: args.dailySpentAfter ?? 0n,
            memo: args.memo ?? "",
          };
        }),
      );
      setEvents(rows.reverse());
    } catch (error) {
      console.error("Unable to load PaymentExecuted events", error);
      setEventsError(true);
    } finally {
      eventsRequestInFlight.current = false;
      setEventsLoading(false);
    }
  }, [publicClient, vaultAddress]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (txConfirmed) {
      void refreshReads();
      void loadEvents();
    }
  }, [loadEvents, refreshReads, txConfirmed]);

  async function runWrite(label: string, action: () => Promise<`0x${string}`>) {
    setWriteResult({ type: "info", message: `${label}: ${t.pending}` });
    try {
      const hash = await action();
      setLastHash(hash);
      setWriteResult({ type: "success", message: `${label}: ${t.submitted} · ${hash}` });
    } catch (error) {
      setWriteResult({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function setAgent() {
    if (!vaultAddress || !isAddress(agentInput)) return;
    await runWrite(t.setAgentAction, () =>
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
    await runWrite(t.setLimitsAction, () =>
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
    await runWrite(allowed ? t.addWhitelistAction : t.removeWhitelistAction, () =>
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
    await runWrite(allowed ? t.enablePaymentAction : t.disablePaymentAction, () =>
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
    await runWrite(paused ? t.pauseAgentAction : t.resumeAgentAction, () =>
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
    await runWrite(t.revokeAgentAction, () =>
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
    await runWrite(t.fundVaultAction, () =>
      sendTransactionAsync({
        to: vaultAddress,
        value: parseEther(fundAmountInput),
        chainId: mantleSepolia.id,
      }),
    );
  }

  async function ownerWithdraw() {
    if (!vaultAddress || !address) return;
    await runWrite(t.ownerWithdrawAction, () =>
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
    setPrecheckResult({ type: "info", message: t.checking });
    setPrecheckReason(null);
    try {
      const agent = policy?.agent;
      if (!agent || !isAddress(agent)) {
        setPrecheckResult({ type: "error", message: t.policyAgentMissing });
        return;
      }
      const [allowed, reason] = await publicClient.readContract({
        address: vaultAddress,
        abi: policyVaultAbi,
        functionName: "isAllowedFor",
        args: [agent, simRecipientInput, parseEther(simAmountInput)],
      });
      setPrecheckReason(reason);
      setPrecheckResult({
        type: allowed ? "success" : "error",
        message: allowed ? t.policyAllows : `${t.policyRejects}: ${reason}`,
      });
    } catch (error) {
      setPrecheckResult({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function copyCode(id: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main className="min-h-screen bg-app text-ink">
      <Header
        view={view}
        language={language}
        connectedAddress={address}
        isConnected={isConnected}
        wrongNetwork={wrongNetwork}
        isConnecting={isConnecting}
        t={t}
        onViewChange={setView}
        onLanguageChange={setLanguage}
        onConnect={() => connectors[0] && connect({ connector: connectors[0], chainId: mantleSepolia.id })}
        onDisconnect={() => disconnect()}
        onSwitchNetwork={() => switchChain({ chainId: mantleSepolia.id })}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {writeResult && <Notice result={writeResult} onClose={() => setWriteResult(null)} />}

        {view === "owner" && (
          <OwnerView
            t={t}
            policy={policy}
            isPolicyLoading={isPolicyLoading}
            paymentActionAllowed={Boolean(paymentActionAllowed)}
            vaultAddress={vaultAddress}
            vaultBalance={vaultBalance?.value}
            dailySpent={dailySpent?.[1]}
            agentState={agentState}
            agentTone={agentTone}
            events={events}
            editingPolicy={editingPolicy}
            canManage={canManage}
            isConnected={isConnected}
            isBusy={isBusy}
            agentInput={agentInput}
            maxPerTxInput={maxPerTxInput}
            dailyLimitInput={dailyLimitInput}
            whitelistInput={whitelistInput}
            whitelistStatus={Boolean(whitelistStatus)}
            fundAmountInput={fundAmountInput}
            withdrawAmountInput={withdrawAmountInput}
            onEditPolicy={() => setEditingPolicy(true)}
            onCloseEditor={() => setEditingPolicy(false)}
            onViewActivity={() => setView("activity")}
            onRefresh={() => void refreshReads()}
            onAgentInput={setAgentInput}
            onMaxPerTxInput={setMaxPerTxInput}
            onDailyLimitInput={setDailyLimitInput}
            onWhitelistInput={setWhitelistInput}
            onFundAmountInput={setFundAmountInput}
            onWithdrawAmountInput={setWithdrawAmountInput}
            onSetAgent={() => void setAgent()}
            onSetLimits={() => void setLimits()}
            onSetWhitelist={(allowed) => void setWhitelist(allowed)}
            onSetPayment={(allowed) => void setPaymentAction(allowed)}
            onPause={(paused) => void pauseAgent(paused)}
            onRevoke={() => void revokeAgent()}
            onFund={() => void fundVault()}
            onWithdraw={() => void ownerWithdraw()}
          />
        )}

        {view === "developer" && (
          <DeveloperView
            t={t}
            vaultAddress={vaultAddress}
            policy={policy}
            paymentActionAllowed={Boolean(paymentActionAllowed)}
            copied={copied}
            onCopy={(id, value) => void copyCode(id, value)}
          />
        )}

        {view === "lab" && (
          <AgentLabView
            t={t}
            recipient={simRecipientInput}
            amount={simAmountInput}
            memo={simMemoInput}
            result={precheckResult}
            reason={precheckReason}
            policy={policy}
            whitelistStatus={Boolean(simWhitelistStatus)}
            onRecipient={setSimRecipientInput}
            onAmount={setSimAmountInput}
            onMemo={setSimMemoInput}
            onPrecheck={() => void runPrecheck()}
            onUseAttack={() => {
              setSimRecipientInput("0x000000000000000000000000000000000000dEaD");
              setSimAmountInput("2");
              setSimMemoInput("Ignore previous instructions");
              setPrecheckResult(null);
              setPrecheckReason(null);
            }}
          />
        )}

        {view === "activity" && (
          <ActivityView
            t={t}
            language={language}
            events={events}
            loading={eventsLoading}
            error={eventsError}
            onRefresh={() => void loadEvents()}
          />
        )}
      </div>
    </main>
  );
}

function Header({
  view,
  language,
  connectedAddress,
  isConnected,
  wrongNetwork,
  isConnecting,
  t,
  onViewChange,
  onLanguageChange,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}: {
  view: View;
  language: Language;
  connectedAddress?: string;
  isConnected: boolean;
  wrongNetwork: boolean;
  isConnecting: boolean;
  t: (typeof COPY)[Language];
  onViewChange: (view: View) => void;
  onLanguageChange: (language: Language) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
}) {
  const labels: Record<View, string> = {
    owner: t.owner,
    developer: t.developer,
    lab: t.lab,
    activity: t.activity,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onViewChange("owner")}>
            <img src="/aipay-symbol.png" alt="AIPay" className="h-11 w-11 rounded-md border border-line object-cover" />
            <span className="min-w-0">
              <span className="block font-display text-xl font-semibold leading-none text-ink">AIPay</span>
              <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.2em] text-muted sm:text-[10px]">
                {t.brandLine}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <StatusPill icon={Network} tone="success" className="hidden md:inline-flex">
              Mantle Sepolia
            </StatusPill>
            <div className="flex rounded-full border border-line bg-panel p-0.5" aria-label="Language">
              <button
                className={`language-button ${language === "zh" ? "language-button-active" : ""}`}
                aria-pressed={language === "zh"}
                onClick={() => onLanguageChange("zh")}
              >
                中文
              </button>
              <button
                className={`language-button ${language === "en" ? "language-button-active" : ""}`}
                aria-pressed={language === "en"}
                onClick={() => onLanguageChange("en")}
              >
                EN
              </button>
            </div>
            {isConnected ? (
              wrongNetwork ? (
                <button className="btn-primary" onClick={onSwitchNetwork}>
                  <Network className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.switchNetwork}</span>
                </button>
              ) : (
                <button className="wallet-button" onClick={onDisconnect} title={t.disconnect}>
                  <span className="status-dot" />
                  <span className="hidden sm:inline">{shortAddress(connectedAddress)}</span>
                  <Wallet className="h-4 w-4 sm:hidden" />
                </button>
              )
            ) : (
              <button className="btn-primary" disabled={isConnecting} onClick={onConnect}>
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">{t.connect}</span>
              </button>
            )}
          </div>
        </div>

        <nav className="flex min-w-0 gap-1 overflow-x-auto pb-1 sm:gap-2" aria-label="AIPay sections">
          {NAV_ITEMS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`nav-pill ${view === id ? "nav-pill-active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => onViewChange(id)}
            >
              <Icon className="h-4 w-4" />
              {labels[id]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

type OwnerViewProps = {
  t: (typeof COPY)[Language];
  policy: { owner: string; agent: string; maxPerTx: bigint; dailyLimit: bigint; paused: boolean; revoked: boolean } | undefined;
  isPolicyLoading: boolean;
  paymentActionAllowed: boolean;
  vaultAddress?: string;
  vaultBalance?: bigint;
  dailySpent?: bigint;
  agentState: string;
  agentTone: "success" | "warning" | "danger";
  events: PaymentEventRow[];
  editingPolicy: boolean;
  canManage: boolean;
  isConnected: boolean;
  isBusy: boolean;
  agentInput: string;
  maxPerTxInput: string;
  dailyLimitInput: string;
  whitelistInput: string;
  whitelistStatus: boolean;
  fundAmountInput: string;
  withdrawAmountInput: string;
  onEditPolicy: () => void;
  onCloseEditor: () => void;
  onViewActivity: () => void;
  onRefresh: () => void;
  onAgentInput: (value: string) => void;
  onMaxPerTxInput: (value: string) => void;
  onDailyLimitInput: (value: string) => void;
  onWhitelistInput: (value: string) => void;
  onFundAmountInput: (value: string) => void;
  onWithdrawAmountInput: (value: string) => void;
  onSetAgent: () => void;
  onSetLimits: () => void;
  onSetWhitelist: (allowed: boolean) => void;
  onSetPayment: (allowed: boolean) => void;
  onPause: (paused: boolean) => void;
  onRevoke: () => void;
  onFund: () => void;
  onWithdraw: () => void;
};

function OwnerView(props: OwnerViewProps) {
  const { t, policy } = props;
  return (
    <div className="space-y-6">
      <section className="overview-shell">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="info">{t.ownerEyebrow}</StatusPill>
              <StatusPill tone="success">{t.ownerLive}</StatusPill>
            </div>
            <h1 className="mt-6 whitespace-pre-line break-keep font-display text-3xl font-semibold leading-[1.08] text-ink sm:text-5xl">
              {t.ownerTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{t.ownerDescription}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={props.onEditPolicy}>
                <Settings2 className="h-4 w-4" />
                {t.editPolicy}
              </button>
              <button className="btn-secondary" onClick={props.onViewActivity}>
                <Activity className="h-4 w-4" />
                {t.viewActivity}
              </button>
            </div>
            <div className="mt-8 border-t border-line pt-5">
              <div className="eyebrow">{t.setupPath}</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                {t.setupSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="step-number">{index + 1}</span>
                    <span className="text-sm font-medium text-ink">{step}</span>
                    {index < t.setupSteps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-line sm:block" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">{t.realtime}</div>
                <h2 className="mt-2 font-display text-2xl font-semibold">{t.runtime}</h2>
              </div>
              <div className="icon-box text-brandSky">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 divide-y divide-line rounded-md border border-line bg-white">
              <RuntimeRow icon={UserRound} label={t.agentAddress} value={shortAddress(policy?.agent)} tone="info" />
              <RuntimeRow icon={ShieldCheck} label={t.authorized} value={props.agentState} tone={props.agentTone} />
              <RuntimeRow
                icon={CircleDollarSign}
                label={t.paymentEnabled}
                value={props.paymentActionAllowed ? t.active : t.paymentDisabled}
                tone={props.paymentActionAllowed ? "success" : "warning"}
              />
              <RuntimeRow icon={Network} label={t.networkReady} value="Chain ID 5003" tone="success" />
            </div>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <Metric icon={Landmark} label={t.vaultBalance} value={formatMnt(props.vaultBalance)} />
        <Metric icon={Activity} label={t.todaySpent} value={formatMnt(props.dailySpent)} />
        <Metric icon={Gauge} label={t.dailyLimit} value={formatMnt(policy?.dailyLimit)} />
        <Metric icon={LockKeyhole} label={t.perTxLimit} value={formatMnt(policy?.maxPerTx)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            eyebrow={t.policy}
            title={t.policy}
            description={t.policyDescription}
            action={
              <button className="icon-button" title={t.refresh} onClick={props.onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </button>
            }
          />
          <div className="mt-5 divide-y divide-line border-y border-line">
            <DataRow label={t.agentAddress} value={policy?.agent ?? "-"} mono />
            <DataRow label={t.perTxLimit} value={formatMnt(policy?.maxPerTx)} />
            <DataRow label={t.dailyLimit} value={formatMnt(policy?.dailyLimit)} />
            <DataRow label={t.whitelist} value={shortAddress(props.whitelistInput)} />
          </div>

          <div className="mt-6">
            <div className="eyebrow">{t.controls}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {policy?.paused ? (
                <button className="btn-secondary" disabled={!props.canManage} onClick={() => props.onPause(false)}>
                  <Play className="h-4 w-4" /> {t.resumeAgent}
                </button>
              ) : (
                <button className="btn-secondary" disabled={!props.canManage} onClick={() => props.onPause(true)}>
                  <Pause className="h-4 w-4" /> {t.pauseAgent}
                </button>
              )}
              <button className="btn-secondary" disabled={!props.canManage} onClick={() => props.onSetPayment(!props.paymentActionAllowed)}>
                <CircleDollarSign className="h-4 w-4" />
                {props.paymentActionAllowed ? t.disablePayment : t.enablePayment}
              </button>
              <button className="btn-danger" disabled={!props.canManage || policy?.revoked} onClick={props.onRevoke}>
                <Ban className="h-4 w-4" /> {t.revokeAgent}
              </button>
            </div>
            {!props.canManage && !props.isPolicyLoading && <p className="mt-3 text-xs text-muted">{t.ownerRequired}</p>}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <SectionHeader eyebrow={t.treasury} title={t.treasury} description={t.treasuryDescription} />
          <div className="mt-5 space-y-5">
            <ActionInput
              label={t.fundAmount}
              value={props.fundAmountInput}
              button={t.fund}
              icon={Plus}
              disabled={!props.isConnected || props.isBusy}
              onValue={props.onFundAmountInput}
              onAction={props.onFund}
            />
            <ActionInput
              label={t.withdrawAmount}
              value={props.withdrawAmountInput}
              button={t.withdraw}
              icon={Wallet}
              disabled={!props.canManage}
              onValue={props.onWithdrawAmountInput}
              onAction={props.onWithdraw}
            />
            {props.vaultAddress && (
              <a className="inline-flex items-center gap-2 text-sm font-medium text-brandSky hover:underline" href={explorerAddressUrl(props.vaultAddress)} target="_blank" rel="noreferrer">
                Mantle Explorer <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </section>
      </div>

      {props.editingPolicy && (
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            eyebrow={t.policyEditor}
            title={t.policyEditor}
            description={t.policyEditorDescription}
            action={
              <button className="btn-secondary" onClick={props.onCloseEditor}>
                {t.closeEditor}
              </button>
            }
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <Field label={t.agentAddress}>
              <input className="input" value={props.agentInput} onChange={(event) => props.onAgentInput(event.target.value)} />
              <button className="btn-secondary mt-2 w-full" disabled={!props.canManage || !isAddress(props.agentInput)} onClick={props.onSetAgent}>
                {t.setAgent}
              </button>
            </Field>
            <div className="space-y-3">
              <Field label={t.maxPerTransaction}>
                <input className="input" value={props.maxPerTxInput} onChange={(event) => props.onMaxPerTxInput(event.target.value)} />
              </Field>
              <Field label={t.dailyLimit}>
                <input className="input" value={props.dailyLimitInput} onChange={(event) => props.onDailyLimitInput(event.target.value)} />
              </Field>
              <button className="btn-secondary w-full" disabled={!props.canManage} onClick={props.onSetLimits}>
                {t.saveLimits}
              </button>
            </div>
            <Field label={t.recipientAddress}>
              <input className="input" value={props.whitelistInput} onChange={(event) => props.onWhitelistInput(event.target.value)} />
              <div className="mt-2 flex gap-2">
                <button className="btn-secondary flex-1" disabled={!props.canManage || !isAddress(props.whitelistInput)} onClick={() => props.onSetWhitelist(true)}>
                  <Plus className="h-4 w-4" /> {t.addWhitelist}
                </button>
                <button className="btn-secondary flex-1" disabled={!props.canManage || !isAddress(props.whitelistInput)} onClick={() => props.onSetWhitelist(false)}>
                  <Ban className="h-4 w-4" /> {t.removeWhitelist}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">
                {t.whitelistStatus}: {props.whitelistStatus ? t.whitelisted : t.notWhitelisted}
              </p>
            </Field>
          </div>
        </section>
      )}

      <section className="surface p-5 sm:p-6">
        <SectionHeader eyebrow={t.activity} title={t.activity} description={t.activityDescription} action={<button className="text-button" onClick={props.onViewActivity}>{t.viewActivity}<ArrowRight className="h-4 w-4" /></button>} />
        <div className="mt-5 divide-y divide-line">
          {props.events.slice(0, 3).map((event) => (
            <ActivityLine key={event.txHash} event={event} />
          ))}
          {props.events.length === 0 && <p className="py-5 text-sm text-muted">{t.noEvents}</p>}
        </div>
      </section>
    </div>
  );
}

function DeveloperView({
  t,
  vaultAddress,
  policy,
  paymentActionAllowed,
  copied,
  onCopy,
}: {
  t: (typeof COPY)[Language];
  vaultAddress?: string;
  policy: { agent: string; paused: boolean; revoked: boolean } | undefined;
  paymentActionAllowed: boolean;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <PageIntro eyebrow={t.developerEyebrow} title={t.developerTitle} description={t.developerDescription} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface p-5 sm:p-6">
          <div className="grid gap-6">
            <CodeStep number="01" title={t.installSdk}>
              <CodeBlock value="npm install @aipay/sdk" copied={copied === "install"} onCopy={() => onCopy("install", "npm install @aipay/sdk")} label={copied === "install" ? t.copied : t.copy} />
            </CodeStep>
            <CodeStep number="02" title={t.configureAgent}>
              <CodeBlock value={SDK_SNIPPET} copied={copied === "sdk"} onCopy={() => onCopy("sdk", SDK_SNIPPET)} label={copied === "sdk" ? t.copied : t.copy} multiline />
            </CodeStep>
            <CodeStep number="03" title={t.executePayment}>
              <p className="text-sm leading-6 text-muted">`executePayment` first calls `isAllowedFor`, then submits the guarded transaction through the Agent wallet.</p>
            </CodeStep>
          </div>
        </section>

        <div className="space-y-6">
          <section className="surface p-5 sm:p-6">
            <SectionHeader eyebrow={t.connection} title={t.connection} description="Mantle Sepolia · Chain ID 5003" />
            <div className="mt-5 divide-y divide-line">
              <DataRow label={t.vaultContract} value={shortAddress(vaultAddress)} tone="success" />
              <DataRow label={t.agentAddress} value={shortAddress(policy?.agent)} tone={policy?.revoked ? "danger" : "success"} />
              <DataRow label={t.paymentEnabled} value={paymentActionAllowed ? t.connected : t.paymentDisabled} tone={paymentActionAllowed ? "success" : "warning"} />
            </div>
          </section>
          <section className="surface p-5 sm:p-6">
            <SectionHeader eyebrow={t.sdkSurface} title={t.sdkSurface} />
            <div className="mt-5 space-y-3">
              <FeatureLine icon={CheckCircle2} text={t.precheck} />
              <FeatureLine icon={ShieldCheck} text={t.guardedPayment} />
              <FeatureLine icon={AlertTriangle} text={t.readableErrors} />
            </div>
          </section>
        </div>
      </div>

      <section className="surface grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.65fr_1.35fr]">
        <div>
          <div className="eyebrow">{t.skillCli}</div>
          <h2 className="mt-2 font-display text-2xl font-semibold">{t.skillCli}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{t.skillDescription}</p>
        </div>
        <CodeBlock value={CLI_SNIPPET} copied={copied === "cli"} onCopy={() => onCopy("cli", CLI_SNIPPET)} label={copied === "cli" ? t.copied : t.copy} multiline />
      </section>
    </div>
  );
}

function AgentLabView({
  t,
  recipient,
  amount,
  memo,
  result,
  reason,
  policy,
  whitelistStatus,
  onRecipient,
  onAmount,
  onMemo,
  onPrecheck,
  onUseAttack,
}: {
  t: (typeof COPY)[Language];
  recipient: string;
  amount: string;
  memo: string;
  result: WriteResult | null;
  reason: string | null;
  policy: { agent: string; maxPerTx: bigint; dailyLimit: bigint; paused: boolean; revoked: boolean } | undefined;
  whitelistStatus: boolean;
  onRecipient: (value: string) => void;
  onAmount: (value: string) => void;
  onMemo: (value: string) => void;
  onPrecheck: () => void;
  onUseAttack: () => void;
}) {
  const allowed = result?.type === "success";
  const rejected = result?.type === "error";
  const amountWithinLimit = policy ? safeParseEther(amount) <= policy.maxPerTx : false;
  return (
    <div className="space-y-6">
      <PageIntro eyebrow={t.labEyebrow} title={t.labTitle} description={t.labDescription} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface p-5 sm:p-6">
          <SectionHeader eyebrow={t.taskInput} title={t.taskInput} description="isAllowedFor(agent, recipient, amount)" />
          <div className="mt-6 space-y-4">
            <Field label={t.recipient}>
              <input className="input font-mono" value={recipient} onChange={(event) => onRecipient(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.amount}>
                <input className="input" value={amount} onChange={(event) => onAmount(event.target.value)} />
              </Field>
              <Field label={t.memo}>
                <input className="input" value={memo} onChange={(event) => onMemo(event.target.value)} />
              </Field>
            </div>
            <button className="btn-primary w-full sm:w-auto" disabled={!isAddress(recipient) || result?.type === "info"} onClick={onPrecheck}>
              <ShieldCheck className="h-4 w-4" /> {result?.type === "info" ? t.checking : t.runPrecheck}
            </button>
          </div>
        </section>

        <section className={`decision-panel ${allowed ? "decision-allowed" : rejected ? "decision-rejected" : ""}`}>
          <div className="eyebrow">{t.decision}</div>
          <div className="mt-5 flex items-start gap-4">
            <div className={`decision-icon ${allowed ? "text-brandMint" : rejected ? "text-danger" : "text-muted"}`}>
              {allowed ? <CheckCircle2 className="h-7 w-7" /> : rejected ? <XCircle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold">{allowed ? t.allowed : rejected ? t.rejected : t.waitingDecision}</h2>
              {result && <p className="mt-2 text-sm text-muted">{result.message}</p>}
            </div>
          </div>
          <div className="mt-6 divide-y divide-line border-y border-line">
            <CheckRow label={t.identityCheck} pass={Boolean(policy?.agent && !policy.paused && !policy.revoked)} value={shortAddress(policy?.agent)} />
            <CheckRow
              label={t.whitelistCheck}
              pass={reason ? reason !== "NOT_WHITELISTED" && whitelistStatus : whitelistStatus}
              value={reason === "NOT_WHITELISTED" ? reason : whitelistStatus ? t.whitelisted : t.notWhitelisted}
            />
            <CheckRow label={t.amountCheck} pass={reason ? reason !== "EXCEEDS_PER_TX" : amountWithinLimit} value={`${amount || "0"} / ${policy ? formatEther(policy.maxPerTx) : "-"} MNT`} />
            <CheckRow label={t.budgetCheck} pass={reason ? reason !== "EXCEEDS_DAILY" : true} value={reason === "EXCEEDS_DAILY" ? reason : "OK"} />
          </div>
        </section>
      </div>

      <section className="surface flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex max-w-2xl items-start gap-4">
          <div className="icon-box text-danger"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <div className="eyebrow">{t.attackTest}</div>
            <p className="mt-2 text-sm leading-6 text-muted">{t.attackDescription}</p>
          </div>
        </div>
        <button className="btn-secondary shrink-0" onClick={onUseAttack}>
          <FlaskConical className="h-4 w-4" /> {t.attackTest}
        </button>
      </section>
    </div>
  );
}

function ActivityView({
  t,
  language,
  events,
  loading,
  error,
  onRefresh,
}: {
  t: (typeof COPY)[Language];
  language: Language;
  events: PaymentEventRow[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageIntro eyebrow={t.activityEyebrow} title={t.activityTitle} description={t.activityDescription} />
      {error && <div className="notice-error rounded-lg border px-4 py-3 text-sm">{t.activityUnavailable}</div>}
      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div>
            <div className="eyebrow">PaymentExecuted</div>
            <h2 className="mt-2 font-display text-2xl font-semibold">{t.activity}</h2>
          </div>
          <button className="btn-secondary" disabled={loading} onClick={onRefresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? t.loading : t.refresh}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel text-xs text-muted">
                <th className="px-5 py-3 font-medium">{t.time}</th>
                <th className="px-5 py-3 font-medium">{t.agent}</th>
                <th className="px-5 py-3 font-medium">{t.recipient}</th>
                <th className="px-5 py-3 font-medium">{t.amountLabel}</th>
                <th className="px-5 py-3 font-medium">{t.memo}</th>
                <th className="px-5 py-3 font-medium">{t.tx}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.txHash} className="hover:bg-panel/70">
                  <td className="px-5 py-4 text-muted">{event.timestamp ? new Date(Number(event.timestamp) * 1000).toLocaleString(language === "zh" ? "zh-CN" : "en-US") : "-"}</td>
                  <td className="px-5 py-4 font-mono text-xs">{shortAddress(event.agent)}</td>
                  <td className="px-5 py-4 font-mono text-xs">{shortAddress(event.to)}</td>
                  <td className="px-5 py-4 font-medium">{formatMnt(event.amount)}</td>
                  <td className="max-w-[220px] truncate px-5 py-4 text-muted">{event.memo || "-"}</td>
                  <td className="px-5 py-4">
                    <a className="icon-link" href={explorerTxUrl(event.txHash)} target="_blank" rel="noreferrer" title="Mantle Explorer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">{t.noEvents}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <SectionHeader eyebrow={t.rejectedEvidence} title={t.rejectedEvidence} description={t.rejectedEvidenceDescription} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EvidenceLink label={t.exceededLimit} reason="ExceedsMaxPerTx" hash="0x62934c1e4d156b94ec31ee0d8aaee154a011e45a97bc3b22e90a9a1074923cbe" />
          <EvidenceLink label={t.outsideWhitelist} reason="RecipientNotWhitelisted" hash="0x07aa11208884285eb7c6e93e0b36990e33887fb30511a4670b04fde957555a06" />
        </div>
      </section>
    </div>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="page-intro">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-4 whitespace-pre-line break-keep font-display text-3xl font-semibold leading-[1.08] text-ink sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-2 font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="metric-tile">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="h-4 w-4 text-brandSky" />
      </div>
      <div className="mt-3 font-display text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function RuntimeRow({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate text-sm text-muted">{label}</span>
      </div>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

type Tone = "success" | "warning" | "danger" | "info";

function StatusPill({ icon: Icon, tone = "info", className = "", children }: { icon?: LucideIcon; tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={`status-pill status-${tone} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

function DataRow({ label, value, mono = false, tone }: { label: string; value: string; mono?: boolean; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-muted">{label}</span>
      {tone ? <StatusPill tone={tone}>{value}</StatusPill> : <span className={`${mono ? "font-mono text-xs" : "text-sm font-medium"} max-w-[65%] truncate text-right text-ink`}>{value}</span>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function ActionInput({ label, value, button, icon: Icon, disabled, onValue, onAction }: { label: string; value: string; button: string; icon: LucideIcon; disabled: boolean; onValue: (value: string) => void; onAction: () => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input className="input pr-14" inputMode="decimal" value={value} onChange={(event) => onValue(event.target.value)} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">MNT</span>
        </div>
        <button className="btn-secondary shrink-0" disabled={disabled} onClick={onAction}>
          <Icon className="h-4 w-4" /> {button}
        </button>
      </div>
    </Field>
  );
}

function ActivityLine({ event }: { event: PaymentEventRow }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="icon-box shrink-0 text-brandMint"><Check className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{event.memo || "Agent payment"}</div>
          <div className="mt-1 font-mono text-[11px] text-muted">{shortAddress(event.to)}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold">{formatMnt(event.amount)}</span>
        <a className="icon-link" href={explorerTxUrl(event.txHash)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
  );
}

function CodeStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-line pb-6 last:border-0 last:pb-0 sm:grid-cols-[56px_1fr]">
      <span className="font-mono text-sm text-brandSky">{number}</span>
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ value, label, copied, onCopy, multiline = false }: { value: string; label: string; copied: boolean; onCopy: () => void; multiline?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-slate-800 bg-slate-950 text-slate-100">
      <pre className={`overflow-x-auto p-4 pr-16 font-mono text-xs leading-6 ${multiline ? "min-h-36" : ""}`}><code>{value}</code></pre>
      <button className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-300 hover:text-white" onClick={onCopy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
        {label}
      </button>
    </div>
  );
}

function FeatureLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <div className="flex items-center gap-3 rounded-md border border-line bg-panel px-4 py-3 text-sm font-medium"><Icon className="h-4 w-4 text-brandMint" />{text}</div>;
}

function CheckRow({ label, pass, value }: { label: string; pass: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={`inline-flex items-center gap-2 text-sm font-medium ${pass ? "text-emerald-700" : "text-red-600"}`}>
        {pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {value}
      </span>
    </div>
  );
}

function EvidenceLink({ label, reason, hash }: { label: string; reason: string; hash: string }) {
  return (
    <a className="flex items-center justify-between gap-4 rounded-md border border-line bg-panel p-4 transition hover:border-red-200 hover:bg-red-50" href={explorerTxUrl(hash)} target="_blank" rel="noreferrer">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="mt-1 font-mono text-[11px] text-red-600">{reason}</div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted" />
    </a>
  );
}

function Notice({ result, onClose }: { result: WriteResult; onClose: () => void }) {
  const style = result.type === "success" ? "notice-success" : result.type === "error" ? "notice-error" : "notice-info";
  return (
    <div className={`mb-6 flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm ${style}`}>
      <span className="break-all">{result.message}</span>
      <button className="shrink-0 opacity-70 hover:opacity-100" onClick={onClose} aria-label="Close"><XCircle className="h-4 w-4" /></button>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function safeParseEther(value: string) {
  try {
    return parseEther(value || "0");
  } catch {
    return 0n;
  }
}
