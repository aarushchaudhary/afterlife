import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ownerWallet = searchParams.get('owner_wallet');
        const beneficiaryWallet = searchParams.get('beneficiary_wallet');

        if (!ownerWallet || !beneficiaryWallet) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Check if beneficiary is in the array using Postgres ANY operator
            const query = `
                SELECT encrypted_note, file_url 
                FROM vault_secrets 
                WHERE owner_wallet = $1 
                AND $2 = ANY(beneficiary_wallets)
                LIMIT 1
            `;
            const result = await client.query(query, [ownerWallet, beneficiaryWallet]);

            return NextResponse.json({ data: result.rows });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Vault Secrets Fetch Error:', error.message);
        return NextResponse.json({ error: "Failed to fetch vault secrets" }, { status: 500 });
    }
}
