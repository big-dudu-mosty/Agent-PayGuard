import { formatEther, isAddress } from "viem";

export function shortAddress(address?: string | null) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatMnt(value?: bigint) {
  if (value === undefined) return "-";
  const formatted = Number(formatEther(value));
  return `${formatted.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} MNT`;
}

export function validAddressOrEmpty(value: string): value is `0x${string}` {
  return value === "" || isAddress(value);
}

