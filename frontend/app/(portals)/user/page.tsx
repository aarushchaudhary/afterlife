"use client";

import { useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { AFTERLIFE_CONTRACT_ADDRESS, AFTERLIFE_ABI } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export default function UserRegistration() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const [formData, setFormData] = useState({
        beneficiary: '',
        hospital: '',
        gov: '',
        verifier: '',
        secretNote: ''
    });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 1. Trigger the Blockchain Transaction
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
            });

            // 2. Once Tx is submitted, store metadata in Supabase
            if (tx) {
                await supabase.from('vault_secrets').insert({
                    owner_wallet: address?.toLowerCase(),
                    beneficiary_wallet: formData.beneficiary.toLowerCase(),
                    encrypted_note: formData.secretNote,
                    status: 'active'
                });
                alert("Vault Created Successfully!");
            }
        } catch (err) {
            console.error(err);
            alert("Registration failed. Check console.");
        }
    };

    return (
        <div className="max-w-xl mx-auto py-20 px-6">
            <h1 className="text-3xl font-bold mb-8">Setup Your Afterlife Vault</h1>
            <form onSubmit={handleRegister} className="space-y-4">
                <input
                    placeholder="Beneficiary Wallet Address"
                    className="w-full p-3 bg-slate-800 rounded border border-slate-700"
                    onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                />
                <input
                    placeholder="Hospital Authorized Wallet"
                    className="w-full p-3 bg-slate-800 rounded border border-slate-700"
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                />
                <input
                    placeholder="Government Registry Wallet"
                    className="w-full p-3 bg-slate-800 rounded border border-slate-700"
                    onChange={(e) => setFormData({ ...formData, gov: e.target.value })}
                />
                <input
                    placeholder="Independent Verifier Wallet"
                    className="w-full p-3 bg-slate-800 rounded border border-slate-700"
                    onChange={(e) => setFormData({ ...formData, verifier: e.target.value })}
                />
                <textarea
                    placeholder="Encrypted Note to Beneficiary"
                    className="w-full p-3 bg-slate-800 rounded border border-slate-700 h-32"
                    onChange={(e) => setFormData({ ...formData, secretNote: e.target.value })}
                />
                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded font-bold transition">
                    Secure My Digital Legacy
                </button>
            </form>
        </div>
    );
}