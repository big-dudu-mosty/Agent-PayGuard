#!/usr/bin/env bash
# Deploy PolicyVault v1.1 to Mantle Sepolia, whitelist the demo recipient and fund the vault.
#
# Required env (put them in the gitignored root .env, this script sources it):
#   OWNER_PRIVATE_KEY  owner wallet private key (deploys, configures, funds)
# Optional overrides:
#   AGENT_ADDRESS, RECIPIENT_ADDRESS, MAX_PER_TX_WEI, DAILY_LIMIT_WEI, FUND_WEI, MANTLE_SEPOLIA_RPC

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

RPC="${MANTLE_SEPOLIA_RPC:-https://rpc.sepolia.mantle.xyz}"
AGENT_ADDRESS="${AGENT_ADDRESS:-0x8114D2D2D34F127741BC45A533EEf9D190F4dD43}"
RECIPIENT_ADDRESS="${RECIPIENT_ADDRESS:-0x7024dA0eA6885441C4567E3CE92Be7CFcec2c9E4}"
MAX_PER_TX_WEI="${MAX_PER_TX_WEI:-1000000000000000000}"     # 1 MNT
DAILY_LIMIT_WEI="${DAILY_LIMIT_WEI:-10000000000000000000}"  # 10 MNT
FUND_WEI="${FUND_WEI:-2000000000000000000}"                 # 2 MNT

: "${OWNER_PRIVATE_KEY:?Set OWNER_PRIVATE_KEY in root .env (gitignored)}"

OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"
echo "Owner:     $OWNER_ADDRESS"
echo "Agent:     $AGENT_ADDRESS"
echo "Recipient: $RECIPIENT_ADDRESS"
echo "Owner balance: $(cast balance "$OWNER_ADDRESS" --rpc-url "$RPC" --ether) MNT"

echo "==> Deploying PolicyVault v1.1"
AGENT_ADDRESS="$AGENT_ADDRESS" \
MAX_PER_TX_WEI="$MAX_PER_TX_WEI" \
DAILY_LIMIT_WEI="$DAILY_LIMIT_WEI" \
forge script contracts/script/DeployPolicyVault.s.sol \
  --rpc-url "$RPC" \
  --private-key "$OWNER_PRIVATE_KEY" \
  --broadcast | tee /tmp/payguard-deploy.log

VAULT_ADDRESS="$(grep -Eo '0x[0-9a-fA-F]{40}' /tmp/payguard-deploy.log | tail -1)"
# forge script logs the returned contract as "vault: address 0x..."
VAULT_ADDRESS="$(grep -Eo 'vault: contract PolicyVault 0x[0-9a-fA-F]{40}' /tmp/payguard-deploy.log | grep -Eo '0x[0-9a-fA-F]{40}' || echo "$VAULT_ADDRESS")"
echo "==> PolicyVault v1.1: $VAULT_ADDRESS"

echo "==> Whitelisting demo recipient"
cast send "$VAULT_ADDRESS" "setWhitelist(address,bool)" "$RECIPIENT_ADDRESS" true \
  --rpc-url "$RPC" --private-key "$OWNER_PRIVATE_KEY"

echo "==> Funding vault with $(cast to-unit "$FUND_WEI" ether) MNT"
cast send "$VAULT_ADDRESS" --value "$FUND_WEI" \
  --rpc-url "$RPC" --private-key "$OWNER_PRIVATE_KEY"

echo "==> Verifying on-chain state"
cast call "$VAULT_ADDRESS" "getPolicy()((address,address,uint256,uint256,bool,bool))" --rpc-url "$RPC"
cast call "$VAULT_ADDRESS" "whitelistedRecipients(address)(bool)" "$RECIPIENT_ADDRESS" --rpc-url "$RPC"
echo "Vault balance: $(cast balance "$VAULT_ADDRESS" --rpc-url "$RPC" --ether) MNT"

echo ""
echo "Done. Next steps:"
echo "  1. Update deployments/mantle-sepolia.json with the new address and txs"
echo "  2. Update agent/.env VAULT_ADDRESS=$VAULT_ADDRESS"
echo "  3. Update apps/web DEFAULT_VAULT_ADDRESS"
echo "Explorer: https://sepolia.mantlescan.xyz/address/$VAULT_ADDRESS"
