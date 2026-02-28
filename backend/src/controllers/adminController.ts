import { Request, Response } from 'express';
import { Client } from 'pg';

export const dropLegacyTrigger = async (req: Request, res: Response): Promise<void> => {
    const pMatch = process.env.DATABASE_URL?.match(/:([^:@]+)@/);
    if (!pMatch) {
        res.status(500).json({ error: 'DB URL not found' });
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const query = `
          DROP TRIGGER IF EXISTS trg_sync_children_ids ON public.children;
          DROP FUNCTION IF EXISTS sync_children_ids();
        `;

        await client.query(query);
        res.status(200).json({ success: true, message: 'Legacy children trigger dropped successfully' });
    } catch (error: any) {
        console.error('Trigger drop error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await client.end();
    }
};
