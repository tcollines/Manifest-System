import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function backup() {
    console.log('Backing up members table...');

    // Fetch all members. If > 1000, need pagination.
    let allMembers: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
                .from('members')
                .select('*')
                .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
                allMembers = allMembers.concat(data);
                if (data.length < pageSize) hasMore = false;
                else page++;
            } else {
                hasMore = false;
            }
        }

        const backupPath = path.resolve(__dirname, `../backups/members_backup_${Date.now()}.json`);
        // Ensure dir exists
        const dir = path.dirname(backupPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(backupPath, JSON.stringify(allMembers, null, 2));
        console.log(`Backup complete. Saved ${allMembers.length} records to ${backupPath}`);

    } catch (e) {
        console.error('Backup failed:', e);
        process.exit(1);
    }
}

backup();
