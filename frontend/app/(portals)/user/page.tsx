"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseGwei } from 'viem';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { User, Shield, Database, FileText, AlertOctagon, Activity, ShieldAlert, Scale, Plus, Trash2 } from 'lucide-react';
import CountdownClock from '@/components/CountdownClock';

export default function UserPortal() {
    const { address, isConnected } = useAccount();
    const [heirs, setHeirs] = useState([{ wallet: '', percentage: 100 }]);
    const [hospital, setHospital] = useState('');
    const [gov, setGov] = useState('');
    const [verifier, setVerifier] = useState('');
    const [secretNote, setSecretNote] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { writeContractAsync, isPending } = useWriteContract();

    useEffect(() => setMounted(true), []);

    // Heir management helpers
    const addHeir = () => setHeirs([...heirs, { wallet: '', percentage: 0 }]);
    const removeHeir = (index: number) => setHeirs(heirs.filter((_, i) => i !== index));
    const updateHeir = (index: number, field: 'wallet' | 'percentage', value: string) => {
        const updated = [...heirs];
        if (field === 'percentage') {
            updated[index].percentage = Number(value) || 0;
        } else {
            updated[index].wallet = value.trim();
        }
        setHeirs(updated);
    };

    const totalPercentage = heirs.reduce((sum, h) => sum + Number(h.percentage), 0);

    // 1. Read the user's own vault status
    const { data: vault, refetch: refetchVault } = useReadContract({
        address: AFTERLIFE_CONTRACT_ADDRESS,
        abi: AFTERLIFE_ABI,
        functionName: 'vaults',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    const isHospitalInitiated = vault && (vault as any)[6] === true;
    const hasVault = vault && (vault as any)[0] !== '0x0000000000000000000000000000000000000000';

    const handleCancelProtocol = async () => {
        try {
            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS,
                abi: AFTERLIFE_ABI,
                functionName: 'cancelDeathProtocol',
                maxPriorityFeePerGas: parseGwei('30'),
                maxFeePerGas: parseGwei('40'),
            });
            if (tx) {
                alert("🛑 Emergency Protocol Successfully Cancelled.");
                refetchVault();
            }
        } catch (err: any) {
            alert(`Cancellation Failed: ${err.message}`);
        }
    };

    const handleRegister = async () => {
        if (!isConnected || !hospital || !gov || !verifier || !secretNote) return;
        if (totalPercentage !== 100) return;
        if (heirs.some(h => !h.wallet)) return;
        try {
            setIsUploading(true);
            let finalFileUrl = null;

            if (file && address) {
                const fileExt = file.name.split('.').pop();
                const filePath = `${address.toLowerCase()}/legacy_document.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('vault_files').upload(filePath, file, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('vault_files').getPublicUrl(filePath);
                finalFileUrl = urlData.publicUrl;
            }

            const { error: dbError } = await supabase.from('vault_secrets').insert([{
                owner_wallet: address?.toLowerCase(),
                beneficiary_wallets: heirs.map(h => h.wallet.toLowerCase()),
                encrypted_note: secretNote, file_url: finalFileUrl, status: 'active'
            }]);
            if (dbError) throw dbError;

            setIsUploading(false);

            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS, abi: AFTERLIFE_ABI, functionName: 'createVault',
                args: [
                    heirs.map(h => h.wallet as `0x${string}`),
                    heirs.map(h => BigInt(h.percentage)),
                    hospital as `0x${string}`, gov as `0x${string}`, verifier as `0x${string}`
                ],
                maxPriorityFeePerGas: parseGwei('30'), maxFeePerGas: parseGwei('40'),
            });
            if (tx) { alert("✅ Vault Secured Successfully!"); refetchVault(); }
        } catch (err: any) { setIsUploading(false); alert(`Error: ${err.message}`); }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-950 bg-[url('/bg-pattern.svg')] text-white py-12 px-6 relative overflow-hidden flex flex-col items-center">
            {/* Ambient Glow turns RED if initiated, otherwise SLATE */}
            <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none transition-colors duration-1000 ${isHospitalInitiated ? 'bg-red-600/20' : 'bg-slate-600/10'}`}></div>

            <div className="max-w-3xl w-full z-10">
                <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-200 flex items-center gap-3"><User /> Citizen Vault</h1>
                        <p className="text-slate-400 mt-2 font-mono text-sm">Secure your digital inheritance.</p>
                    </div>
                    <ConnectButton />
                </header>

                {!isConnected ? (
                    <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-center backdrop-blur-xl">Please connect your Owner wallet (Account 1).</div>
                ) : isHospitalInitiated ? (
                    /* THE EMERGENCY OVERRIDE UI */
                    <div className="bg-red-950/40 backdrop-blur-xl p-10 rounded-2xl border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse border border-red-500/50">
                            <AlertOctagon size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-red-500 mb-4 tracking-widest uppercase">Emergency Protocol Active</h2>
                        <p className="text-red-200/80 mb-8 max-w-lg">
                            An authorized medical entity has reported a vital sign failure and initiated the 72-hour multi-sig countdown. If you are alive, you must cancel this process immediately.
                        </p>
                        <div className="mb-8 w-full max-w-md">
                            <CountdownClock initiationTime={Number((vault as any)[5])} />
                        </div>
                        <button
                            onClick={handleCancelProtocol} disabled={isPending}
                            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-[0_0_30px_rgba(239,68,68,0.5)] tracking-widest text-lg flex justify-center gap-3"
                        >
                            {isPending ? "Transmitting Cancellation..." : "I AM ALIVE — CANCEL OVERRIDE"}
                        </button>
                    </div>
                ) : hasVault ? (
                    /* THE ALREADY REGISTERED UI */
                    <div className="p-10 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-xl text-center shadow-2xl">
                        <Shield size={48} className="mx-auto text-green-400 mb-4 opacity-50" />
                        <h2 className="text-2xl font-bold text-slate-200 mb-2">Vault Secured</h2>
                        <p className="text-slate-400 font-mono text-sm">Your digital legacy is actively protected on the Polygon blockchain.</p>
                    </div>
                ) : (
                    /* THE REGISTRATION UI */
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
                        {/* Dynamic Heirs Section */}
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Shield size={16} /> Beneficiary Heirs & Percentages
                            </label>
                            <div className="space-y-3">
                                {heirs.map((heir, index) => (
                                    <div key={index} className="flex gap-3 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <input
                                            placeholder="Heir Wallet (0x...)"
                                            value={heir.wallet}
                                            className="flex-[7] p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono"
                                            onChange={(e) => updateHeir(index, 'wallet', e.target.value)}
                                        />
                                        <div className="flex-[3] relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                placeholder="%"
                                                value={heir.percentage}
                                                className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono text-center"
                                                onChange={(e) => updateHeir(index, 'percentage', e.target.value)}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">%</span>
                                        </div>
                                        {heirs.length > 1 && (
                                            <button
                                                onClick={() => removeHeir(index)}
                                                className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={addHeir}
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors font-mono px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10"
                                >
                                    <Plus size={14} /> Add Heir
                                </button>
                                <span className={`font-mono text-sm font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
                                    Total: {totalPercentage}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><Activity size={16} /> Designated Hospital Wallet</label>
                            <input placeholder="0x..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setHospital(e.target.value.trim())} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><ShieldAlert size={16} /> Designated Government Wallet</label>
                            <input placeholder="0x..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setGov(e.target.value.trim())} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><Scale size={16} /> Designated Verifier Wallet</label>
                            <input placeholder="0x..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setVerifier(e.target.value.trim())} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><Database size={16} /> Secret Legacy Note</label>
                            <textarea placeholder="Private instructions, seed phrases, or final messages..." rows={4} className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setSecretNote(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><FileText size={16} /> Attach Legal Document (Optional)</label>
                            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-slate-200 hover:file:bg-white/20 cursor-pointer" />
                        </div>
                        <button onClick={handleRegister} disabled={isPending || isUploading || totalPercentage !== 100} className="w-full py-4 bg-slate-100 hover:bg-white text-slate-950 disabled:bg-white/10 disabled:text-slate-500 font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:shadow-none">
                            {isUploading ? "Encrypting File..." : isPending ? "Securing Vault..." : totalPercentage !== 100 ? `PERCENTAGES MUST EQUAL 100% (Currently ${totalPercentage}%)` : "INITIALIZE PROTOCOL"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}