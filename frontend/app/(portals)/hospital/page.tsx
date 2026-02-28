"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseGwei } from 'viem';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';

export default function HospitalDashboard() {
    const { isConnected } = useAccount();
    const [searchAddress, setSearchAddress] = useState('');
    const { writeContractAsync, isPending } = useWriteContract();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration errors
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch vault details using the standardized JSON ABI
    const { data: vault, refetch } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [searchAddress as `0x${string}`],
        query: { enabled: searchAddress.length === 42 }
    });

    const handleInitiate = async () => {
        if (!isConnected) {
            alert("Please connect your Hospital wallet first.");
            return;
        }

        if (!searchAddress) return;

        try {
            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS,
                abi: AFTERLIFE_ABI,
                functionName: 'initiateDeath',
                args: [searchAddress as `0x${string}`],
                // Use a single Legacy gasPrice instead of EIP-1559 fields
                gasPrice: parseGwei('40'),
            });

            if (tx) {
                alert("🚨 Death Protocol Successfully Initiated on Blockchain.");
                refetch();
            }
        } catch (err: any) {
            console.error(err);
            alert(`Action failed: ${err.shortMessage || err.message || "Unauthorized wallet?"}`);
        }
    };

    if (!mounted) return null;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6 text-white">
            <header className="flex justify-between items-center mb-12 border-b border-red-900/30 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-red-500">Emergency Response Portal</h1>
                    <p className="text-slate-400 mt-2">Authorized Hospital Personnel Only</p>
                </div>
                {/* 1. Added the Connect Button so Wagmi doesn't lose the network state */}
                <ConnectButton />
            </header>

            {/* 2. Added a check to force the user to connect before seeing the search bar */}
            {!isConnected ? (
                <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-500 rounded text-center">
                    Please connect your official Hospital wallet (Account 1) to continue.
                </div>
            ) : (
                <div className="bg-slate-900 p-8 rounded-xl border border-red-900/30">
                    <h2 className="text-xl font-semibold mb-4">Search Deceased Citizen</h2>
                    <div className="flex gap-4 mb-8">
                        <input
                            placeholder="Enter Citizen Wallet Address (0x...)"
                            className="flex-1 p-4 bg-slate-950 rounded border border-slate-800 focus:border-red-500 outline-none"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value.trim())}
                        />
                    </div>

                    {vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000' ? (
                        <div className="p-6 bg-slate-950 rounded-lg border border-slate-800">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                                <p className="text-slate-500">Beneficiary:</p>
                                <p className="truncate text-blue-400">{(vault as any)[1]}</p>
                                <p className="text-slate-500">Status:</p>
                                <p className={(vault as any)[9] ? "text-green-500" : "text-yellow-500"}>
                                    {(vault as any)[9] ? "Unlocked" : ((vault as any)[5] > 0 ? "Death Initiated (Countdown Active)" : "Active/Protected")}
                                </p>
                            </div>

                            {!(vault as any)[6] && (
                                <button
                                    onClick={handleInitiate}
                                    disabled={isPending}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-bold rounded transition"
                                >
                                    {isPending ? "Confirming on Mobile..." : "INITIATE EMERGENCY PROTOCOL"}
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