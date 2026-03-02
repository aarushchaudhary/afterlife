"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { ALGORAND_APP_ID, algodClient, getABIContract, encodeVaultBoxKey } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Search, Activity, RefreshCw } from 'lucide-react';
import CountdownClock from '@/components/CountdownClock';

// ---------- decode box ----------
interface VaultFlags {
    isActive: boolean;
    isUnlocked: boolean;
    hospitalApproved: boolean;
    govApproved: boolean;
    verifierApproved: boolean;
}

function decodeVaultFlags(data: Uint8Array): VaultFlags {
    const b = data[0];
    return {
        isActive: !!(b & 0x80),
        isUnlocked: !!(b & 0x40),
        hospitalApproved: !!(b & 0x20),
        govApproved: !!(b & 0x10),
        verifierApproved: !!(b & 0x08),
    };
}

// ---------- Wallet Connect Button ----------
function WalletConnectButton() {
    const { wallets, activeAddress } = useWallet();
    if (activeAddress) {
        return (
            <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-400 bg-black/40 px-3 py-2 rounded-xl border border-white/10 truncate max-w-[180px]">
                    {activeAddress.slice(0, 4)}...{activeAddress.slice(-4)}
                </span>
                <button onClick={() => wallets[0]?.disconnect()} className="px-4 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all">Disconnect</button>
            </div>
        );
    }
    return (
        <button onClick={async () => { try { await wallets[0]?.connect(); } catch { await wallets[0]?.disconnect(); await wallets[0]?.connect(); } }} className="px-6 py-3 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">Connect Pera Wallet</button>
    );
}

// ---------- Main Page ----------
export default function HospitalDashboard() {
    const { activeAddress, transactionSigner } = useWallet();
    const isConnected = !!activeAddress;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWallet, setSelectedWallet] = useState('');
    const [queue, setQueue] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [vaultFlags, setVaultFlags] = useState<VaultFlags | null>(null);
    const [initiatedAt, setInitiatedAt] = useState<number>(0);

    useEffect(() => { setMounted(true); fetchQueue(); }, []);

    const fetchQueue = async () => {
        const { data } = await supabase.from('verification_queue').select('*').eq('status', 'active');
        if (data) setQueue(data);
    };

    // Read vault box for the selected wallet
    const fetchVault = useCallback(async () => {
        if (!selectedWallet) { setVaultFlags(null); return; }
        try {
            const boxKey = encodeVaultBoxKey(selectedWallet);
            const boxResponse = await algodClient.getApplicationBoxByName(ALGORAND_APP_ID, boxKey).do();
            setVaultFlags(decodeVaultFlags(boxResponse.value));
        } catch {
            setVaultFlags(null);
        }
    }, [selectedWallet]);

    useEffect(() => { fetchVault(); }, [fetchVault]);

    // Fetch initiated_at timestamp for the selected wallet
    useEffect(() => {
        if (!selectedWallet) { setInitiatedAt(0); return; }
        const item = queue.find(q => q.owner_wallet === selectedWallet);
        if (item?.initiated_at) {
            setInitiatedAt(Math.floor(new Date(item.initiated_at).getTime() / 1000));
        } else {
            setInitiatedAt(0);
        }
    }, [selectedWallet, queue]);

    const handleInitiate = async () => {
        if (!isConnected || !selectedWallet) return;
        try {
            setIsPending(true);
            const contract = getABIContract();
            const method = contract.getMethodByName('initiate_death');
            const suggestedParams = await algodClient.getTransactionParams().do();

            const ownerPubKey = algosdk.decodeAddress(selectedWallet).publicKey;
            const boxKey = encodeVaultBoxKey(selectedWallet);

            const atc = new algosdk.AtomicTransactionComposer();
            atc.addMethodCall({
                appID: ALGORAND_APP_ID,
                method,
                methodArgs: [ownerPubKey],
                sender: activeAddress!,
                signer: transactionSigner,
                suggestedParams,
                boxes: [{ appIndex: ALGORAND_APP_ID, name: boxKey }],
            });

            await atc.execute(algodClient, 4);
            alert("🚨 Emergency Protocol Initiated. 72-Hour Clock Started.");
            fetchVault();
            fetchQueue();
        } catch (err: any) {
            alert(`Transaction failed: ${err.message}`);
        } finally {
            setIsPending(false);
        }
    };

    if (!mounted) return null;

    const filteredQueue = queue.filter(item => item.owner_wallet.includes(searchQuery.toLowerCase()));
    const hasVaultData = vaultFlags?.isActive === true;

    return (
        <div className="min-h-screen bg-slate-950 bg-[url('/bg-pattern.svg')] text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-red-900/20 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-6xl w-full mx-auto py-12 px-6 z-10 relative flex flex-col h-screen animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 flex flex-col h-full overflow-hidden">
                    <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 shrink-0">
                        <div>
                            <h1 className="text-4xl font-bold text-red-500 flex items-center gap-3"><Activity /> Hospital Command Center</h1>
                            <p className="text-slate-400 font-mono mt-2">Monitor active citizens and initiate emergency protocols.</p>
                        </div>
                        <WalletConnectButton />
                    </header>

                    {!isConnected ? (
                        <div className="p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-500 rounded text-center">
                            Please connect your official Hospital wallet.
                        </div>
                    ) : (
                        <div className="flex gap-8 flex-1 overflow-hidden">
                            {/* LEFT PANE: The Queue */}
                            <div className="w-1/3 bg-black/40 rounded-xl border border-white/10 backdrop-blur-md flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                                    <h2 className="font-bold text-slate-200">Monitored Citizens</h2>
                                    <button onClick={fetchQueue} className="text-slate-400 hover:text-white transition-colors"><RefreshCw size={18} /></button>
                                </div>
                                <div className="p-4 border-b border-white/10 relative">
                                    <Search className="absolute left-7 top-[1.1rem] text-slate-500" size={18} />
                                    <input
                                        placeholder="Search wallet..."
                                        className="w-full pl-10 p-4 bg-black/40 rounded-xl border border-white/10 outline-none focus:border-red-400 font-mono text-sm transition-all"
                                        onChange={(e) => setSearchQuery(e.target.value.trim())}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {filteredQueue.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedWallet(item.owner_wallet)}
                                            className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedWallet === item.owner_wallet ? 'bg-red-500/20 border-red-400' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                        >
                                            <p className="font-mono text-sm truncate text-slate-300">{item.owner_wallet}</p>
                                            <span className="text-xs text-green-500 font-bold mt-2 block">STATUS: ACTIVE</span>
                                        </div>
                                    ))}
                                    {filteredQueue.length === 0 && <p className="text-slate-500 text-center mt-8 text-sm">No citizens found.</p>}
                                </div>
                            </div>

                            {/* RIGHT PANE: The Action Panel */}
                            <div className="w-2/3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-8 flex flex-col overflow-y-auto">
                                {!selectedWallet ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono">
                                        <Activity size={48} className="mb-4 opacity-20" />
                                        <p>Select a citizen from the queue to review their vault.</p>
                                    </div>
                                ) : hasVaultData ? (
                                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                        <h2 className="text-2xl font-bold text-slate-100 border-b border-white/10 pb-4">Vault Details</h2>
                                        <div className="p-6 bg-black/40 rounded-xl border border-white/10 space-y-3 font-mono text-sm backdrop-blur-md">
                                            <p><span className="text-slate-500">Owner:</span> {selectedWallet}</p>
                                        </div>
                                        <div className="p-6 bg-black/40 rounded-xl border border-white/10 backdrop-blur-md">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Blockchain Status</p>
                                            <div className="flex gap-4">
                                                <Badge label="Hospital" active={vaultFlags!.hospitalApproved} />
                                                <Badge label="Government" active={vaultFlags!.govApproved} />
                                                <Badge label="Verifier" active={vaultFlags!.verifierApproved} />
                                            </div>
                                        </div>
                                        {vaultFlags!.hospitalApproved && !vaultFlags!.isUnlocked && (
                                            <div className="mt-6 animate-in fade-in zoom-in duration-500">
                                                <p className="text-slate-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    Emergency Override Window
                                                </p>
                                                <CountdownClock initiationTime={initiatedAt} />
                                            </div>
                                        )}
                                        {!vaultFlags!.hospitalApproved && (
                                            <button
                                                onClick={handleInitiate} disabled={isPending}
                                                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 font-bold rounded transition cursor-pointer flex justify-center items-center gap-2"
                                            >
                                                {isPending ? "Signing..." : <><Activity size={20} /> INITIATE PROTOCOL</>}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500 italic mt-20">Loading blockchain data or Vault not found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Badge({ label, active }: { label: string; active: boolean }) {
    return (
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-black/40 text-slate-500 border border-white/10'}`}>
            {label}: {active ? "APPROVED" : "PENDING"}
        </div>
    );
}