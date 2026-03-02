import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const ownerWallet = searchParams.get('owner_wallet');

        const client = await pool.connect();
        try {
            let query = 'SELECT * FROM verification_queue WHERE 1=1';
            let params: any[] = [];

            if (status) {
                params.push(status);
                query += ` AND status = $${params.length}`;
            }
            if (ownerWallet) {
                params.push(ownerWallet);
                query += ` AND owner_wallet = $${params.length}`;
            }

            query += ' ORDER BY initiated_at DESC NULLS LAST';

            const result = await client.query(query, params);
            return NextResponse.json({ data: result.rows });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Queue Fetch Error:', error.message);
        return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
    }
}
