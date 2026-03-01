"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseGwei } from 'viem';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Search, Activity, RefreshCw } from 'lucide-react';
import CountdownClock from '@/components/CountdownClock';

export default function HospitalDashboard() {
    const { isConnected } = useAccount();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWallet, setSelectedWallet] = useState('');
    const [queue, setQueue] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const { writeContractAsync, isPending } = useWriteContract();

    useEffect(() => { setMounted(true); fetchQueue(); }, []);

    const fetchQueue = async () => {
        // Hospital sees "active" (living) patients to monitor
        const { data } = await supabase.from('verification_queue').select('*').eq('status', 'active');
        if (data) setQueue(data);
    };

    const { data: vault, refetch: refetchBlockchain } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [selectedWallet as `0x${string}`],
        query: { enabled: selectedWallet.length === 42 }
    });

    const handleInitiate = async () => {
        if (!isConnected || !selectedWallet) return;
        try {
            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS,
                abi: AFTERLIFE_ABI,
                functionName: 'initiateDeath',
                args: [selectedWallet as `0x${string}`],
                maxPriorityFeePerGas: parseGwei('30'),
                maxFeePerGas: parseGwei('40'),
            });
            if (tx) {
                alert("🚨 Emergency Protocol Initiated. 72-Hour Clock Started.");
                refetchBlockchain();
                fetchQueue();
            }
        } catch (err: any) {
            alert(`Transaction failed: ${err.shortMessage || err.message}`);
        }
    };

    if (!mounted) return null;

    const filteredQueue = queue.filter(item => item.owner_wallet.includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-950 bg-[url('/bg-pattern.svg')] text-white flex flex-col relative overflow-hidden">
            {/* Ambient Glowing Orb */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-red-900/20 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-6xl w-full mx-auto py-12 px-6 z-10 relative flex flex-col h-screen animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 flex flex-col h-full overflow-hidden">
                    <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 shrink-0">
                        <div>
                            <h1 className="text-4xl font-bold text-red-500 flex items-center gap-3"><Activity /> Hospital Command Center</h1>
                            <p className="text-slate-400 font-mono mt-2">Monitor active citizens and initiate emergency protocols.</p>
                        </div>
                        <ConnectButton />
                    </header>

                    {!isConnected ? (
                        <div className="p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-500 rounded text-center">
                            Please connect your official Hospital wallet (Account 1).
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
                                ) : vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000' ? (
                                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                        <h2 className="text-2xl font-bold text-slate-100 border-b border-white/10 pb-4">Vault Details</h2>
                                        <div className="p-6 bg-black/40 rounded-xl border border-white/10 space-y-3 font-mono text-sm backdrop-blur-md">
                                            <p><span className="text-slate-500">Owner:</span> {selectedWallet}</p>
                                        </div>
                                        <div className="p-6 bg-black/40 rounded-xl border border-white/10 backdrop-blur-md">
                                            <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">Blockchain Status</p>
                                            <div className="flex gap-4">
                                                <Badge label="Hospital" active={(vault as any)[5]} />
                                                <Badge label="Government" active={(vault as any)[6]} />
                                                <Badge label="Verifier" active={(vault as any)[7]} />
                                            </div>
                                        </div>
                                        {/* Conditionally render the Countdown Clock if Hospital has initiated */}
                                        {(vault as any)[5] && !(vault as any)[8] && (
                                            <div className="mt-6 animate-in fade-in zoom-in duration-500">
                                                <p className="text-slate-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    Emergency Override Window
                                                </p>
                                                <CountdownClock initiationTime={Number((vault as any)[4])} />
                                            </div>
                                        )}
                                        {!(vault as any)[5] && (
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