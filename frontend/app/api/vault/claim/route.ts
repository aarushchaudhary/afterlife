import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner');
    const caller = req.headers.get('x-user-wallet');

    // Fetch from RDS
    const result = await pool.query(
        "SELECT * FROM vault_secrets WHERE owner_wallet = $1 AND status = 'unlocked'",
        [owner]
    );

    const vault = result.rows[0];

    // Manual Security Check (Replaces Supabase RLS)
    if (vault && vault.beneficiary_wallets.includes(caller)) {
        return NextResponse.json(vault);
    }

    return NextResponse.json({ error: "Unauthorized or locked" }, { status: 403 });
}