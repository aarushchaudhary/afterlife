"use client";

import './globals.css';
import { WalletManager, WalletId, NetworkId, DEFAULT_NETWORK_CONFIG } from '@txnlab/use-wallet';
import { WalletProvider } from '@txnlab/use-wallet-react';
import { useMemo } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const walletManager = useMemo(() => {
    return new WalletManager({
      wallets: [WalletId.PERA],
      defaultNetwork: NetworkId.TESTNET,
      networks: {
        ...DEFAULT_NETWORK_CONFIG,
        [NetworkId.TESTNET]: {
          ...DEFAULT_NETWORK_CONFIG[NetworkId.TESTNET],
          algod: {
            baseServer: 'https://testnet-api.algonode.cloud',
            token: '',
            port: '443',
          }
        }
      }
    });
  }, []);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <WalletProvider manager={walletManager}>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}