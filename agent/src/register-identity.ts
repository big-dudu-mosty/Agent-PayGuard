/**
 * Registers the PayGuard demo agent in the ERC-8004 Identity Registry on
 * Mantle Sepolia, minting an agent identity NFT owned by the agent wallet.
 *
 * The registration file is embedded as a data: URI so the identity is fully
 * self-contained (no external hosting dependency).
 *
 *   npm run agent:register-identity
 */
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantleSepolia, requireAddress, requireEnv } from "./config.js";

const IDENTITY_REGISTRY = "0x8004A3718bD35CF767BC0E718bf21Ec4073502f0" as const;

const identityRegistryAbi = parseAbi([
  "function register(string tokenURI) returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)",
]);

async function main() {
  const rawKey = requireEnv("AGENT_PRIVATE_KEY");
  const account = privateKeyToAccount(
    (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`,
  );
  const vaultAddress = requireAddress(requireEnv("VAULT_ADDRESS"), "VAULT_ADDRESS");
  const rpcUrl = process.env.MANTLE_SEPOLIA_RPC ?? "https://rpc.sepolia.mantle.xyz";

  const registration = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Agent PayGuard Demo Agent",
    description:
      "AI finance agent that executes native MNT payments on Mantle exclusively through " +
      "the Agent PayGuard PolicyVault. Per-transaction limits, daily budget and a recipient " +
      "whitelist are enforced on-chain; the agent never holds the owner's funds.",
    agentWallet: account.address,
    skills: ["guarded_mnt_payment"],
    endpoints: { policyVault: vaultAddress, network: "eip155:5003" },
  };

  const tokenURI = `data:application/json;base64,${Buffer.from(
    JSON.stringify(registration),
  ).toString("base64")}`;

  const publicClient = createPublicClient({ chain: mantleSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: mantleSepolia, transport: http(rpcUrl) });

  console.log("Registering ERC-8004 identity for agent:", account.address);
  console.log("Identity Registry:", IDENTITY_REGISTRY);

  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: identityRegistryAbi,
    functionName: "register",
    args: [tokenURI],
  });
  console.log("Registration tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Status:", receipt.status);

  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({ abi: identityRegistryAbi, data: log.data, topics: log.topics });
      if (event.eventName === "Registered") {
        console.log("Agent ID:", event.args.agentId.toString());
        console.log(`Explorer: https://sepolia.mantlescan.xyz/tx/${hash}`);
        console.log(
          `Identity NFT: https://sepolia.mantlescan.xyz/token/${IDENTITY_REGISTRY}?a=${event.args.agentId.toString()}`,
        );
        return;
      }
    } catch {
      // not a Registered event, skip
    }
  }
  console.warn("Registered event not found in receipt logs; check the tx on the explorer.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
