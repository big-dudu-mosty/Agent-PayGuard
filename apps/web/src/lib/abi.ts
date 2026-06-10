export const policyVaultAbi = [
  {
    type: "function",
    name: "setAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent_", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setLimits",
    stateMutability: "nonpayable",
    inputs: [
      { name: "maxPerTx_", type: "uint256" },
      { name: "dailyLimit_", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setWhitelist",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAllowedAction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "actionType", type: "uint8" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pauseAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "paused", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeAgent",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
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
    name: "ownerWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
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
    name: "allowedActions",
    stateMutability: "view",
    inputs: [{ name: "actionType", type: "uint8" }],
    outputs: [{ name: "allowed", type: "bool" }],
  },
  {
    type: "function",
    name: "whitelistedRecipients",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "allowed", type: "bool" }],
  },
  {
    type: "event",
    name: "PaymentExecuted",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "day", type: "uint256", indexed: false },
      { name: "dailySpentAfter", type: "uint256", indexed: false },
      { name: "memo", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnerWithdrawal",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
