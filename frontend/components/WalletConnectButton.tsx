"use client";

import { useWallet } from '@txnlab/use-wallet-react';
import { useState } from 'react';

export default function WalletConnectButton() {
    const { wallets, activeAddress } = useWallet();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        try {
            const peraWallet = wallets.find(w => w.id === 'pera');
            if (peraWallet) {
                // If already connected but we're here, try to disconnect first to clear stale sessions
                if (peraWallet.isConnected) {
                    await peraWallet.disconnect();
                }
                await peraWallet.connect();
            }
        } catch (err: any) {
            console.error('Wallet connection error:', err);
            // Handle specific Pera errors if needed, but usually just logging is enough for debugging
            if (err?.message?.includes('closed by user')) {
                // User simply closed the modal, no need for alert
            } else {
                alert(`Connection failed: ${err.message || 'Unknown error'}`);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            const peraWallet = wallets.find(w => w.id === 'pera');
            if (peraWallet) {
                await peraWallet.disconnect();
            }
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    };

    if (activeAddress) {
        return (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
                <span className="font-mono text-xs text-slate-400 bg-black/40 px-3 py-2 rounded-xl border border-white/10 truncate max-w-[180px]">
                    {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
                </span>
                <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            disabled={isConnecting}
            onClick={handleConnect}
            className="px-6 py-3 bg-slate-100 hover:bg-white disabled:bg-slate-400 text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none"
        >
            {isConnecting ? "Connecting..." : "Connect Pera Wallet"}
        </button>
    );
}
