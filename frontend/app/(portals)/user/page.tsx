"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { parseGwei } from 'viem';

export default function UserRegistration() {
    const { address, isConnected } = useAccount();
    // 1. We added 'isPending' here to track the loading state
    const { writeContractAsync, isPending } = useWriteContract();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [formData, setFormData] = useState({
        beneficiary: '',
        hospital: '',
        gov: '',
        verifier: '',
        secretNote: ''
    });

    const handleRegister = async () => {
        console.log("1. Button Clicked!"); // Debug log

        if (!isConnected) {
            alert("Please connect your wallet first!");
            return;
        }

        // Basic validation before hitting the blockchain
        if (!formData.beneficiary || !formData.hospital || !formData.gov || !formData.verifier) {
            alert("Please fill in all 4 wallet addresses.");
            return;
        }

        try {
            console.log("2. Sending to MetaMask..."); // Debug log

            const tx = await writeContractAsync({
                address: AFTERLIFE_CONTRACT_ADDRESS,
                abi: AFTERLIFE_ABI,
                functionName: 'createVault',
                args: [
                    formData.beneficiary as `0x${string}`,
                    formData.hospital as `0x${string}`,
                    formData.gov as `0x${string}`,
                    formData.verifier as `0x${string}`,
                ],
                // 👇 Add these two lines to bypass Amoy's strict minimums
                maxPriorityFeePerGas: parseGwei('30'),
                maxFeePerGas: parseGwei('40'),
            });

            console.log("3. Transaction Hash Received:", tx); // Debug log

            if (tx) {
                const { error } = await supabase.from('vault_secrets').insert({
                    owner_wallet: address?.toLowerCase(),
                    beneficiary_wallet: formData.beneficiary.toLowerCase(),
                    encrypted_note: formData.secretNote,
                    status: 'active'
                });

                if (error) {
                    console.error("Supabase Error:", error);
                    alert("Vault created on-chain, but failed to save secret note to database.");
                } else {
                    alert("✅ Vault Created Successfully!");
                }
            }
        } catch (err: any) {
            console.error("Registration Error:", err);
            alert(`Registration failed: ${err.shortMessage || err.message}`);
        }
    };

    if (!mounted) return null;

    return (
        <div className="max-w-xl mx-auto py-20 px-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Setup Your Vault</h1>
                <ConnectButton />
            </div>

            {!isConnected ? (
                <div className="bg-slate-900 p-10 rounded-xl border border-slate-800 text-center">
                    <p className="text-slate-400 mb-6">Connect your wallet to start securing your digital legacy.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <input
                        placeholder="Beneficiary Wallet Address (0x...)"
                        className="w-full p-3 bg-slate-800 rounded border border-slate-700 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value.trim() })}
                    />
                    <input
                        placeholder="Hospital Authorized Wallet (0x...)"
                        className="w-full p-3 bg-slate-800 rounded border border-slate-700 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, hospital: e.target.value.trim() })}
                    />
                    <input
                        placeholder="Government Registry Wallet (0x...)"
                        className="w-full p-3 bg-slate-800 rounded border border-slate-700 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, gov: e.target.value.trim() })}
                    />
                    <input
                        placeholder="Independent Verifier Wallet (0x...)"
                        className="w-full p-3 bg-slate-800 rounded border border-slate-700 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, verifier: e.target.value.trim() })}
                    />
                    <textarea
                        placeholder="Encrypted Note to Beneficiary"
                        className="w-full p-3 bg-slate-800 rounded border border-slate-700 h-32 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, secretNote: e.target.value })}
                    />

                    {/* 2. Changed from type="submit" to a direct onClick, and added disabled state */}
                    <button
                        onClick={handleRegister}
                        disabled={isPending}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded font-bold transition cursor-pointer"
                    >
                        {isPending ? "Confirming in MetaMask..." : "Secure My Digital Legacy"}
                    </button>
                </div>
            )}
        </div>
    );
}