import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { ownerWallet, beneficiaryWallets, encryptedNote, s3ObjectKey } = await req.json();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insert into vault_secrets (Replaces old Supabase call)
            await client.query(`
        INSERT INTO vault_secrets (owner_wallet, beneficiary_wallets, encrypted_note, file_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (owner_wallet) DO UPDATE 
        SET beneficiary_wallets = $2, encrypted_note = $3, file_url = $4
      `, [ownerWallet, beneficiaryWallets, encryptedNote, s3ObjectKey]);

            // 2. Insert into verification_queue
            await client.query(`
        INSERT INTO verification_queue (owner_wallet, status)
        VALUES ($1, 'active')
        ON CONFLICT (owner_wallet) DO NOTHING
      `, [ownerWallet]);

            await client.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        return NextResponse.json({ error: "Failed to save vault" }, { status: 500 });
    }
}