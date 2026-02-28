"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export default function BeneficiaryPortal() {
    const { address, isConnected } = useAccount();
    const [searchAddress, setSearchAddress] = useState('');
    const [secretNote, setSecretNote] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 1. Read the Vault status from the blockchain (100% Free, no gas!)
    const { data: vault } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [searchAddress as `0x${string}`],
        query: { enabled: searchAddress.length === 42 }
    });

    const handleClaim = async () => {
        if (!address || !vault) return;

        // 2. Security Check: Is the connected wallet the actual beneficiary?
        if ((vault as any)[1].toLowerCase() !== address.toLowerCase()) {
            alert("🛑 Unauthorized: You are not the designated beneficiary for this vault.");
            return;
        }

        // 3. Security Check: Is the vault fully unlocked via Multi-Sig?
        if (!(vault as any)[9]) {
            alert("🔒 Vault is still locked. Waiting for legal multi-sig approval.");
            return;
        }

        setLoading(true);
        try {
            // 4. Fetch the secret note from Supabase (Bulletproof version)
            const { data, error } = await supabase
                .from('vault_secrets')
                .select('encrypted_note')
                .ilike('owner_wallet', searchAddress) // ilike ignores case sensitivity
                .ilike('beneficiary_wallet', address)
                .limit(1); // Prevents the .single() crash if you have duplicate test rows

            if (error) {
                console.error("Supabase Error Details:", error);
                throw error;
            }

            if (data && data.length > 0) {
                setSecretNote(data[0].encrypted_note);
            } else {
                alert("Vault found on blockchain, but no secret note was found in the database for this wallet combo.");
            }
        } catch (err: any) {
            console.error("Full error:", err);
            alert("Database Error: Check your browser console for details.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    const isUnlocked = vault && (vault as any)[9] === true;

    return (
        <div className="max-w-4xl mx-auto py-12 px-6 text-white">
            <header className="flex justify-between items-center mb-12 border-b border-purple-900/30 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-purple-400">Beneficiary Claim Portal</h1>
                    <p className="text-slate-400 mt-2">Access your designated digital legacy.</p>
                </div>
                <ConnectButton />
            </header>

            {!isConnected ? (
                <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 text-yellow-500 rounded text-center">
                    Please connect your Beneficiary wallet (Account 2) to continue.
                </div>
            ) : (
                <div className="bg-slate-900 p-8 rounded-xl border border-purple-900/30 space-y-8">
                    <div>
                        <input
                            placeholder="Enter the Deceased's Wallet Address (0x...)"
                            className="w-full p-4 bg-slate-950 rounded border border-slate-800 outline-none focus:border-purple-500"
                            onChange={(e) => setSearchAddress(e.target.value.trim())}
                        />
                    </div>

                    {vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000' && (
                        <div className="p-6 bg-slate-950 rounded-lg border border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-slate-500 text-sm">Vault Status</p>
                                    <p className={`font-bold text-lg ${isUnlocked ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {isUnlocked ? "🔓 UNLOCKED" : "🔒 LOCKED"}
                                    </p>
                                </div>
                            </div>

                            {!secretNote ? (
                                <button
                                    onClick={handleClaim}
                                    disabled={loading || !isUnlocked}
                                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 font-bold rounded transition cursor-pointer"
                                >
                                    {loading ? "Decrypting..." : "CLAIM DIGITAL LEGACY"}
                                </button>
                            ) : (
                                <div className="mt-6 p-6 bg-purple-900/20 border border-purple-500/50 rounded-lg">
                                    <h3 className="text-purple-300 font-bold mb-4 uppercase tracking-wider text-sm">Decrypted Legacy Note</h3>
                                    <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        {secretNote}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}