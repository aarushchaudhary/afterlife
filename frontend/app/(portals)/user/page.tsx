"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { ALGORAND_APP_ID, algodClient, getABIContract, encodeVaultBoxKey } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { User, Shield, Database, FileText, AlertOctagon, Activity, ShieldAlert, Scale, Plus, Trash2, Key, ShieldCheck, Play, XCircle, Info, Send, Terminal } from 'lucide-react';
import WalletConnectButton from '@/components/WalletConnectButton';
import CountdownClock from '@/components/CountdownClock';

// ---------- helpers to decode box data ----------
interface VaultState {
    isActive: boolean;
    isUnlocked: boolean;
    hospitalApproved: boolean;
    govApproved: boolean;
    verifierApproved: boolean;
}

function decodeBoolByte(byte: number): { b0: boolean; b1: boolean; b2: boolean; b3: boolean; b4: boolean } {
    // The first ARC4 byte packs 5 booleans: is_active(bit0), is_unlocked(bit1), hospital(bit2), gov(bit3), verifier(bit4)
    return {
        b0: !!(byte & 0x80),
        b1: !!(byte & 0x40),
        b2: !!(byte & 0x20),
        b3: !!(byte & 0x10),
        b4: !!(byte & 0x08),
    };
}

function decodeVaultBox(data: Uint8Array): VaultState {
    const flags = decodeBoolByte(data[0]);
    return {
        isActive: flags.b0,
        isUnlocked: flags.b1,
        hospitalApproved: flags.b2,
        govApproved: flags.b3,
        verifierApproved: flags.b4,
    };
}

// ---------- Main Page ----------
export default function UserPortal() {
    const { activeAddress, transactionSigner } = useWallet();
    const isConnected = !!activeAddress;

    const [heirs, setHeirs] = useState([{ wallet: '', percentage: 100 }]);
    const [hospital, setHospital] = useState('');
    const [gov, setGov] = useState('');
    const [verifier, setVerifier] = useState('');
    const [secretNote, setSecretNote] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Vault state read from box storage
    const [vaultState, setVaultState] = useState<VaultState | null>(null);
    const [hasVault, setHasVault] = useState(false);
    const [initiatedAt, setInitiatedAt] = useState<number>(0);

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

    // Read vault from box storage
    const fetchVault = useCallback(async () => {
        if (!activeAddress) return;
        try {
            const boxKey = encodeVaultBoxKey(activeAddress);
            const boxResponse = await algodClient.getApplicationBoxByName(ALGORAND_APP_ID, boxKey).do();
            const decoded = decodeVaultBox(boxResponse.value);
            setVaultState(decoded);
            setHasVault(decoded.isActive);
        } catch {
            // Box not found → user has no vault
            setVaultState(null);
            setHasVault(false);
        }
    }, [activeAddress]);

    useEffect(() => {
        if (activeAddress) fetchVault();
    }, [activeAddress, fetchVault]);

    // Fetch initiated_at from backend for the countdown
    useEffect(() => {
        if (!activeAddress) { setInitiatedAt(0); return; }
        (async () => {
            try {
                const res = await fetch(`/api/queue?owner_wallet=${activeAddress}`);
                const json = await res.json();
                const data = json.data?.[0];
                if (data?.initiated_at) {
                    setInitiatedAt(Math.floor(new Date(data.initiated_at).getTime() / 1000));
                } else {
                    setInitiatedAt(0);
                }
            } catch { setInitiatedAt(0); }
        })();
    }, [activeAddress, vaultState]);

    // Cancel death protocol
    const handleCancelProtocol = async () => {
        if (!activeAddress) return;
        try {
            setIsPending(true);
            const contract = getABIContract();
            const method = contract.getMethodByName('cancel_death_protocol');
            const suggestedParams = await algodClient.getTransactionParams().do();

            const boxKey = encodeVaultBoxKey(activeAddress);

            const atc = new algosdk.AtomicTransactionComposer();
            atc.addMethodCall({
                appID: ALGORAND_APP_ID,
                method,
                methodArgs: [],
                sender: activeAddress,
                signer: transactionSigner,
                suggestedParams,
                boxes: [{ appIndex: ALGORAND_APP_ID, name: boxKey }],
            });

            await atc.execute(algodClient, 4);
            alert("🛑 Emergency Protocol Successfully Cancelled.");
            fetchVault();
        } catch (err: any) {
            alert(`Cancellation Failed: ${err.message}`);
        } finally {
            setIsPending(false);
        }
    };


    // Create vault
    const handleRegister = async () => {
        if (!isConnected || !hospital || !gov || !verifier || !secretNote || !activeAddress) return;
        if (totalPercentage !== 100) return;
        if (heirs.some(h => !h.wallet)) return;

        try {
            setIsUploading(true);
            let objectKey = null;

            if (file) {
                // 1. Get S3 Upload URL
                const s3Res = await fetch('/api/s3-upload', {
                    method: 'POST',
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type,
                        ownerWallet: activeAddress
                    })
                });
                if (!s3Res.ok) throw new Error("Failed to get S3 upload URL");

                const s3Data = await s3Res.json();
                const uploadUrl = s3Data.uploadUrl;
                objectKey = s3Data.objectKey;

                // 2. Upload file directly to S3
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file // In a real app, this should be encryptedFileBlob
                });
                if (!uploadRes.ok) throw new Error("Failed to upload file to S3");
            }

            // 3. Save everything to RDS
            const rdsRes = await fetch('/api/vault', {
                method: 'POST',
                body: JSON.stringify({
                    ownerWallet: activeAddress,
                    beneficiaryWallets: heirs.map(h => h.wallet),
                    encryptedNote: secretNote,
                    s3ObjectKey: objectKey // Save the S3 path, not a Supabase URL
                })
            });

            if (!rdsRes.ok) throw new Error("Failed to save vault to RDS");

            setIsUploading(false);
            setIsPending(true);

            const contract = getABIContract();
            const method = contract.getMethodByName('create_vault');
            const suggestedParams = await algodClient.getTransactionParams().do();

            // Encode ABI args: address[] and uint64[]
            const heirAddresses = heirs.map(h => algosdk.decodeAddress(h.wallet).publicKey);
            const heirPercentages = heirs.map(h => BigInt(h.percentage));

            const hospitalAddr = algosdk.decodeAddress(hospital).publicKey;
            const govAddr = algosdk.decodeAddress(gov).publicKey;
            const verifierAddr = algosdk.decodeAddress(verifier).publicKey;

            // Box reference for the sender's vault
            const boxKey = encodeVaultBoxKey(activeAddress);

            // Estimate box size for MBR: 1 byte flags + 3×32 addr + 2 bytes header offset + (numHeirs × 40 bytes each) + 2 bytes length prefix
            const estBoxSize = 1 + 96 + 2 + (heirs.length * 40) + 2;
            const mbrNeeded = 2500 + (400 * (boxKey.length + estBoxSize));

            // Fund MBR via a payment transaction before the app call
            const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                sender: activeAddress,
                receiver: algosdk.getApplicationAddress(ALGORAND_APP_ID),
                amount: BigInt(mbrNeeded),
                suggestedParams,
            });

            const atc = new algosdk.AtomicTransactionComposer();

            // Add MBR payment first
            atc.addTransaction({ txn: payTxn, signer: transactionSigner });

            atc.addMethodCall({
                appID: ALGORAND_APP_ID,
                method,
                methodArgs: [heirAddresses, heirPercentages, hospitalAddr, govAddr, verifierAddr],
                sender: activeAddress,
                signer: transactionSigner,
                suggestedParams,
                boxes: [{ appIndex: ALGORAND_APP_ID, name: boxKey }],
            });

            await atc.execute(algodClient, 4);
            alert("✅ Vault Secured Successfully in AWS and Algorand!");
            fetchVault();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setIsUploading(false);
            setIsPending(false);
        }
    };

    if (!mounted) return null;

    const isHospitalInitiated = vaultState?.hospitalApproved === true;

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
                    <WalletConnectButton />
                </header>

                {!isConnected ? (
                    <div className="p-6 bg-white/5 border border-white/10 rounded-xl text-center backdrop-blur-xl">Please connect your Owner wallet.</div>
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
                            <CountdownClock initiationTime={initiatedAt} />
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
                        <p className="text-slate-400 font-mono text-sm">Your digital legacy is actively protected on the Algorand blockchain.</p>
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
                                            placeholder="Heir Wallet (Algorand Address)"
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
                            <input placeholder="Algorand Address..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setHospital(e.target.value.trim())} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><ShieldAlert size={16} /> Designated Government Wallet</label>
                            <input placeholder="Algorand Address..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setGov(e.target.value.trim())} />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><Scale size={16} /> Designated Verifier Wallet</label>
                            <input placeholder="Algorand Address..." className="w-full p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 outline-none focus:border-slate-400 transition-all font-mono" onChange={(e) => setVerifier(e.target.value.trim())} />
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