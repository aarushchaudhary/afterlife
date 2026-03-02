"use client";

import { useEffect } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RoleRedirector() {
    const { activeAddress } = useWallet();
    const router = useRouter();

    useEffect(() => {
        async function routeUser() {
            if (activeAddress) {
                // Check the wallet against your Supabase 'roles' table
                const { data, error } = await supabase
                    .from('roles')
                    .select('role')
                    .eq('wallet_address', activeAddress.toLowerCase())
                    .single();

                if (error || !data) {
                    router.push('/user');
                    return;
                }

                // Teleport them to their authorized portal
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
    }, [activeAddress, router]);

    return null;
}