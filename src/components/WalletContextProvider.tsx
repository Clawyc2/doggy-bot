"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { SolanaMobileWalletAdapter } from "@solana-mobile/wallet-adapter-mobile";

require("@solana/wallet-adapter-react-ui/styles.css");

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Use RPC from environment variable
  // NEXT_PUBLIC_RPC_URL must be set in Vercel environment variables
  const endpoint = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      console.error('❌ NEXT_PUBLIC_RPC_URL not configured');
      return 'https://api.mainnet-beta.solana.com'; // Fallback to public RPC
    }
    return rpcUrl;
  }, []);
  
  const wallets = useMemo(
    () => [
      // Mobile wallet adapter - handles deep links automatically
      new SolanaMobileWalletAdapter({
        appIdentity: {
          name: 'DOGGY Holder Verify',
          uri: 'https://doggy-bot.vercel.app',
        },
      }),
      // Desktop wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
