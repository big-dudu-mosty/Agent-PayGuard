export const policyVaultAbi = [
  {
    type: "function",
    name: "executePayment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "function",
    name: "isAllowedFor",
    stateMutability: "view",
    inputs: [
      { name: "caller", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getDailySpent",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "day", type: "uint256" },
      { name: "spent", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getPolicy",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "agent", type: "address" },
          { name: "maxPerTx", type: "uint256" },
          { name: "dailyLimit", type: "uint256" },
          { name: "paused", type: "bool" },
          { name: "revoked", type: "bool" },
        ],
      },
    ],
  },
  { type: "error", name: "ActionNotAllowed", inputs: [] },
  { type: "error", name: "AgentPausedError", inputs: [] },
  { type: "error", name: "AgentRevokedError", inputs: [] },
  { type: "error", name: "ExceedsDailyLimit", inputs: [] },
  { type: "error", name: "ExceedsMaxPerTx", inputs: [] },
  { type: "error", name: "InsufficientBalance", inputs: [] },
  { type: "error", name: "InvalidConfig", inputs: [] },
  { type: "error", name: "NotAgent", inputs: [] },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "RecipientNotWhitelisted", inputs: [] },
  { type: "error", name: "Reentrancy", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
] as const;
