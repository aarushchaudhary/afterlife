"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseGwei } from 'viem';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';

export default function VerifierDashboard() {
    const { isConnected } = useAccount();
    const [searchAddress, setSearchAddress] = useState('');
    const { writeContractAsync, isPending } = useWriteContract();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: vault, refetch } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [searchAddress as `0x${string}`],
        query: { enabled: searchAddress.length === 42 }
    });

    const handleApprove = async () => {
        if (!isConnected) return;

        try {
            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS,
                abi: AFTERLIFE_ABI,
                functionName: 'approveDeath',
                args: [searchAddress as `0x${string}`],
                // DELETE the maxPriority and maxFee lines
                // USE this legacy gas line instead:
                gasPrice: parseGwei('40'),
            });
            if (tx) {
                alert("✅ Verification Confirmed. Approval broadcasted to blockchain.");
                refetch();
            }
        } catch (err: any) {
            alert(`Approval failed: ${err.shortMessage || err.message}`);
        }
    };

    if (!mounted) return null;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6 text-white">
            <header className="flex justify-between items-center mb-12 border-b border-blue-900/30 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-blue-400">Independent Verifier Portal</h1>
                    <p className="text-slate-400 mt-2">Authorized Legal Entities Only</p>
                </div>
                <ConnectButton />
            </header>

            {!isConnected ? (
                <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-500 rounded text-center">
                    Please connect your official Verifier wallet (Account 4) to continue.
                </div>
            ) : (
                <div className="bg-slate-900 p-8 rounded-xl border border-blue-900/30">
                    <input
                        placeholder="Search Deceased Wallet (0x...)"
                        className="w-full p-4 bg-slate-950 rounded border border-slate-800 mb-6 outline-none focus:border-blue-500"
                        onChange={(e) => setSearchAddress(e.target.value.trim())}
                    />

                    {vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000' ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-950 rounded border border-slate-800">
                                <p className="text-slate-500 text-xs uppercase tracking-widest">Multi-Sig Status</p>
                                <div className="flex gap-4 mt-4">
                                    <Badge label="Hospital" active={(vault as any)[6]} />
                                    <Badge label="Government" active={(vault as any)[7]} />
                                    <Badge label="Verifier" active={(vault as any)[8]} />
                                </div>
                            </div>

                            {/* Only show button if Verifier hasn't approved yet AND countdown is active */}
                            {!(vault as any)[8] && (vault as any)[5] > 0 && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isPending}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 font-bold rounded transition cursor-pointer"
                                >
                                    {isPending ? "Signing on Mobile..." : "APPROVE LEGAL VERIFICATION"}
                                </button>
                            )}
                        </div>
                    ) : searchAddress.length === 42 && (
                        <p className="text-center text-slate-500 italic">No Afterlife Vault found for this address.</p>
                    )}
                </div>
            )}
        </div>
    );
}

function Badge({ label, active }: { label: string; active: boolean }) {
    return (
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
            {label}: {active ? "APPROVED" : "PENDING"}
        </div>
    );
}