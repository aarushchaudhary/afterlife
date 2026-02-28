"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RoleRedirector() {
    // Wagmi hook to get the connected wallet address
    const { address, isConnected } = useAccount();
    const router = useRouter();

    useEffect(() => {
        async function routeUser() {
            // Only run if the wallet is actually connected
            if (isConnected && address) {

                // 1. Check the wallet against your Supabase 'roles' table
                const { data, error } = await supabase
                    .from('roles')
                    .select('role')
                    .eq('wallet_address', address.toLowerCase())
                    .single();

                // 2. If they aren't in the table, they are a normal citizen
                if (error || !data) {
                    router.push('/user');
                    return;
                }

                // 3. Teleport them to their authorized portal
                switch (data.role) {
                    case 'hospital':
                        router.push('/hospital');
                        break;
                    case 'government':
                        router.push('/gov');
                        break;
                    case 'verifier':
                        router.push('/verifier');
                        break;
                    default:
                        router.push('/user');
                }
            }
        }

        routeUser();
    }, [isConnected, address, router]);

    // This component renders nothing visually. It just runs the logic.
    return null;
}