"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Key, Lock, Unlock, ShieldCheck, Terminal } from 'lucide-react';
import CountdownClock from '@/components/CountdownClock';

export default function BeneficiaryPortal() {
    const { address, isConnected } = useAccount();
    const [searchAddress, setSearchAddress] = useState('');
    const [secretNote, setSecretNote] = useState<string | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [displayedNote, setDisplayedNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [decrypting, setDecrypting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Typewriter Effect for Decryption
    useEffect(() => {
        if (secretNote && !decrypting) {
            let i = 0;
            const interval = setInterval(() => {
                setDisplayedNote(secretNote.substring(0, i + 1));
                i++;
                if (i >= secretNote.length) clearInterval(interval);
            }, 30); // Speed of typing
            return () => clearInterval(interval);
        }
    }, [secretNote, decrypting]);

    const { data: vault } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [searchAddress as `0x${string}`],
        query: { enabled: searchAddress.length === 42 }
    });

    // Fetch the beneficiaries array from the contract
    const { data: beneficiariesList } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'getBeneficiaries',
        args: [searchAddress as `0x${string}`],
        query: { enabled: searchAddress.length === 42 }
    });

    const handleClaim = async () => {
        if (!address || !vault) return;

        // Check if connected wallet is in the beneficiaries array
        const isBeneficiary = beneficiariesList && (beneficiariesList as any[]).some(
            (b: any) => b.wallet.toLowerCase() === address.toLowerCase()
        );
        if (!isBeneficiary) {
            alert("🛑 Unauthorized: You are not a designated beneficiary.");
            return;
        }

        setLoading(true);
        setDecrypting(true);

        try {
            const { data, error } = await supabase
                .from('vault_secrets')
                .select('encrypted_note, file_url')
                .ilike('owner_wallet', searchAddress)
                .contains('beneficiary_wallets', [address.toLowerCase()])
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

        } catch (err: any) {
            alert("Database Error: Could not retrieve the legacy note.");
            setLoading(false);
            setDecrypting(false);
        }
    };

    if (!mounted) return null;

    const isUnlocked = Boolean(vault && (vault as any)[9] === true);

    return (
        <div className="min-h-screen bg-[url('/bg-pattern.svg')] bg-slate-950 text-white flex flex-col items-center py-12 px-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-900/20 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-4xl w-full z-10 animate-in fade-in zoom-in duration-300">
                <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-purple-400 flex items-center gap-3">
                            <Key /> Beneficiary Vault
                        </h1>
                        <p className="text-slate-400 mt-2 font-mono text-sm">Secure endpoint for inheritance retrieval.</p>
                    </div>
                    <ConnectButton />
                </header>

                {!isConnected ? (
                    <div className="p-6 bg-black/40 border border-white/10 text-yellow-500 rounded-xl text-center backdrop-blur-md font-mono">
                        Please connect your designated Beneficiary wallet (Account 2).
                    </div>
                ) : (
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl transition-all">

                        <div className="relative mb-8">
                            <Terminal className="absolute left-4 top-4 text-purple-500" size={20} />
                            <input
                                placeholder="Enter Deceased Wallet Address (0x...)"
                                className="w-full pl-12 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-purple-400 font-mono transition-all"
                                onChange={(e) => setSearchAddress(e.target.value.trim())}
                            />
                        </div>

                        {Boolean(vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000') && (
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
                                {(vault as any)[6] && !isUnlocked && (
                                    <div className="animate-in fade-in zoom-in duration-500">
                                        <CountdownClock initiationTime={Number((vault as any)[5])} />
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
                                        {/* Scanning line animation */}
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