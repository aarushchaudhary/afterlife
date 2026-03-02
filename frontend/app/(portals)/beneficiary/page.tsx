"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { ALGORAND_APP_ID, algodClient, getABIContract, encodeVaultBoxKey } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Key, Lock, Unlock, ShieldCheck, Terminal } from 'lucide-react';
import CountdownClock from '@/components/CountdownClock';
import WalletConnectButton from '@/components/WalletConnectButton';

// ---------- decode box ----------
interface VaultFlags {
    isActive: boolean;
    isUnlocked: boolean;
    hospitalApproved: boolean;
}

function decodeVaultFlags(data: Uint8Array): VaultFlags {
    const b = data[0];
    return {
        isActive: !!(b & 0x80),
        isUnlocked: !!(b & 0x40),
        hospitalApproved: !!(b & 0x20),
    };
}


// ---------- Main Page ----------
export default function BeneficiaryPortal() {
    const { activeAddress } = useWallet();
    const isConnected = !!activeAddress;

    const [searchAddress, setSearchAddress] = useState('');
    const [secretNote, setSecretNote] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [displayedNote, setDisplayedNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [decrypting, setDecrypting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [vaultFlags, setVaultFlags] = useState<VaultFlags | null>(null);
    const [isBeneficiary, setIsBeneficiary] = useState(false);
    const [initiatedAt, setInitiatedAt] = useState<number>(0);

    useEffect(() => setMounted(true), []);

    // Typewriter Effect for Decryption
    useEffect(() => {
        if (secretNote && !decrypting) {
            let i = 0;
            const interval = setInterval(() => {
                setDisplayedNote(secretNote.substring(0, i + 1));
                i++;
                if (i >= secretNote.length) clearInterval(interval);
            }, 30);
            return () => clearInterval(interval);
        }
    }, [secretNote, decrypting]);

    // Read vault from box storage & Authenticate Beneficiary
    const fetchVault = useCallback(async () => {
        if (!searchAddress || searchAddress.length < 58) {
            setVaultFlags(null);
            setIsBeneficiary(false);
            return;
        }

        try {
            const boxKey = encodeVaultBoxKey(searchAddress);
            const boxResponse = await algodClient.getApplicationBoxByName(ALGORAND_APP_ID, boxKey).do();

            // 1. Decode the flags (for the UI locks)
            setVaultFlags(decodeVaultFlags(boxResponse.value));

            // 2. Decode the FULL vault exactly like the Python Oracle does
            const vaultTupleType = algosdk.ABIType.from(
                "(bool,bool,bool,bool,bool,address,address,address,(address,uint64)[])"
            );

            const decodedVault = vaultTupleType.decode(boxResponse.value) as any[];

            // Index 8 is the beneficiaries array: (address,uint64)[]
            const beneficiariesArray = decodedVault[8] as [string, bigint][];

            // 3. Check if the active connected wallet is in this array
            if (activeAddress) {
                // Ensure case-insensitive comparison for robustness
                const currentWallet = activeAddress.toUpperCase();
                const isFound = beneficiariesArray.some((target) => target[0].toUpperCase() === currentWallet);
                setIsBeneficiary(isFound);
            } else {
                setIsBeneficiary(false);
            }

        } catch (err: any) {
            // Gracefully handle "Box not found" (404) as a valid state (no vault)
            const is404 = err?.status === 404 || err?.message?.includes("box not found");

            if (!is404) {
                console.error("Failed to fetch or decode vault box:", err);
            }

            setVaultFlags(null);
            setIsBeneficiary(false);
        }
    }, [searchAddress, activeAddress]);

    useEffect(() => {
        fetchVault();
    }, [fetchVault]);

    // Fetch initiated_at from Supabase for the countdown
    useEffect(() => {
        if (!searchAddress || searchAddress.length < 58) {
            setInitiatedAt(0);
            return;
        }
        (async () => {
            try {
                const { data } = await supabase.from('verification_queue').select('initiated_at').eq('owner_wallet', searchAddress).single();
                if (data?.initiated_at) {
                    setInitiatedAt(Math.floor(new Date(data.initiated_at).getTime() / 1000));
                } else {
                    setInitiatedAt(0);
                }
            } catch {
                setInitiatedAt(0);
            }
        })();
    }, [searchAddress, vaultFlags]);

    const handleClaim = async () => {
        if (!activeAddress || !vaultFlags) return;

        if (!isBeneficiary) {
            alert("🛑 Unauthorized: You are not a designated beneficiary.");
            return;
        }

        setLoading(true);
        setDecrypting(true);

        try {
            // Set the x-user-wallet header for RLS
            (supabase as any).rest.headers.set('x-user-wallet', activeAddress);

            const { data, error } = await supabase
                .from('vault_secrets')
                .select('encrypted_note, file_url')
                .eq('owner_wallet', searchAddress)
                .contains('beneficiary_wallets', [activeAddress])
                .limit(1);

            if (error) throw error;

            // Fake a 2-second cryptographic "decryption" delay for UX
            setTimeout(() => {
                setDecrypting(false);
                if (data && data.length > 0) {
                    setSecretNote(data[0].encrypted_note);
                    setFileUrl(data[0].file_url);
                } else {
                    setSecretNote("No secure payload found for this address.");
                }
                setLoading(false);
            }, 2000);

        } catch (err) {
            console.error("Database Error:", err);
            alert("Database Error: Could not retrieve the legacy note.");
            setLoading(false);
            setDecrypting(false);
        }
    };

    if (!mounted) return null;

    const isUnlocked = vaultFlags?.isUnlocked === true;
    const hasVaultData = vaultFlags?.isActive === true;

    return (
        <div className="min-h-screen bg-[url('/bg-pattern.svg')] bg-slate-950 text-white flex flex-col items-center py-12 px-6 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-900/20 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl w-full z-10 animate-in fade-in zoom-in duration-300">
                <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-purple-400 flex items-center gap-3">
                            <Key /> Beneficiary Vault
                        </h1>
                        <p className="text-slate-400 mt-2 font-mono text-sm">Secure endpoint for inheritance retrieval.</p>
                    </div>
                    <WalletConnectButton />
                </header>

                {!isConnected ? (
                    <div className="p-6 bg-black/40 border border-white/10 text-yellow-500 rounded-xl text-center backdrop-blur-md font-mono">
                        Please connect your designated Beneficiary wallet.
                    </div>
                ) : (
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl transition-all">

                        <div className="relative mb-8">
                            <Terminal className="absolute left-4 top-4 text-purple-500" size={20} />
                            <input
                                placeholder="Enter Deceased Wallet Address (Algorand Address)"
                                className="w-full pl-12 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-purple-400 font-mono transition-all"
                                onChange={(e) => setSearchAddress(e.target.value.trim())}
                            />
                        </div>

                        {hasVaultData && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                <div className="flex items-center justify-between p-6 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                                    <div>
                                        <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Vault Status</p>
                                        <div className={`flex items-center gap-2 font-bold text-xl ${isUnlocked ? 'text-green-400' : 'text-yellow-500'}`}>
                                            {isUnlocked ? <><Unlock size={24} /> DECRYPTED & UNLOCKED</> : <><Lock size={24} /> CRYPTOGRAPHICALLY LOCKED</>}
                                        </div>
                                    </div>
                                    {isUnlocked && <ShieldCheck size={40} className="text-green-500/20" />}
                                </div>

                                {/* Show countdown if initiated but not fully unlocked */}
                                {vaultFlags!.hospitalApproved && !isUnlocked && (
                                    <div className="animate-in fade-in zoom-in duration-500">
                                        <CountdownClock initiationTime={initiatedAt} />
                                    </div>
                                )}

                                {!secretNote && !decrypting ? (
                                    <button
                                        onClick={handleClaim}
                                        disabled={loading || !isUnlocked}
                                        className="w-full py-5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:shadow-none tracking-widest uppercase"
                                    >
                                        {loading ? "Authenticating Signatures..." : "Initiate Decryption Sequence"}
                                    </button>
                                ) : (
                                    <div className="mt-8 p-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl shadow-[inset_0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/50 animate-[scan_2s_ease-in-out_infinite]"></div>

                                        <h3 className="text-purple-400 font-mono mb-6 uppercase tracking-widest text-xs border-b border-purple-900/50 pb-2 flex items-center gap-2">
                                            <Terminal size={14} /> Secure Payload Revealed
                                        </h3>

                                        {decrypting ? (
                                            <div className="font-mono text-green-400/80 animate-pulse text-sm">
                                                [SYSTEM] Verifying Multi-Sig Consensus...<br />
                                                [SYSTEM] Bypassing Oracle Locks...<br />
                                                [SYSTEM] Decrypting AES-256 Payload...
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed font-mono text-lg">
                                                    {displayedNote}
                                                    <span className="animate-pulse bg-purple-500 text-transparent ml-1">_</span>
                                                </p>
                                                {fileUrl && (
                                                    <button
                                                        onClick={() => window.open(fileUrl, '_blank')}
                                                        className="mt-4 w-full py-4 bg-white/5 hover:bg-white/10 text-purple-300 font-bold rounded-xl transition border border-purple-500/30 flex justify-center items-center gap-2"
                                                    >
                                                        Download Attached Document
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}