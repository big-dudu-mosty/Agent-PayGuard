import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/core";
import { mantleSepolia } from "./chain";

export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  connectors: [injected()],
  transports: {
    [mantleSepolia.id]: http(),
  },
  ssr: true,
});
