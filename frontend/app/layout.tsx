"use client";

import './globals.css';
import { WalletManager, WalletId, NetworkId } from '@txnlab/use-wallet';
import { WalletProvider } from '@txnlab/use-wallet-react';
import { useMemo } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const walletManager = useMemo(() => {
    return new WalletManager({
      wallets: [WalletId.PERA],
      defaultNetwork: NetworkId.LOCALNET,
      networks: {
        [NetworkId.LOCALNET]: {
          algod: {
            baseServer: 'http://localhost',
            port: 4001,
            token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        },
      },
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