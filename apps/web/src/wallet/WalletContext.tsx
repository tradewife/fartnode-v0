import { useMemo, type ReactNode } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletProvider } from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from "@solana/wallet-adapter-wallets";

type WalletProvidersProps = {
  children: ReactNode;
};

const DEVNET_ENDPOINT = clusterApiUrl(WalletAdapterNetwork.Devnet);

export const WalletProviders = ({ children }: WalletProvidersProps): JSX.Element => {
  const isBrowser = typeof window !== "undefined";

  const wallets = useMemo(
    () => (isBrowser ? [new PhantomWalletAdapter(), new SolflareWalletAdapter()] : []),
    [isBrowser]
  );

  if (!isBrowser) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={DEVNET_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
