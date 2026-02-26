
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mimic UserStore.ts mapUserToDB
const mapUserToDB = (u: any) => {
    const data = {
        id: u.id,
        name: u.name,
        role: u.role,
        departmentId: u.department_id, // Wait, UserStore maps departmentId (app) -> department_id (db)?
        // Let's check UserStore.ts code:
        // departmentId: u.department_id, <--- This looks WRONG if input is User object with departmentId
        // departmentUid: u.department_uid, 
        // ...
    };
    return data;
};

// Actually, let's copy the EXACT function from UserStore.ts to be sure
const realMapUserToDB = (u: any) => {
    const data = {
        id: u.id,
        name: u.name,
        role: u.role,
        department_id: u.departmentId || u.department_id, // FIXED LOGIC
        // But 'u' is the User object from the App.
        // User interface has 'departmentId' (camelCase).
        // So u.department_id is likely UNDEFINED!

        departmentUid: u.department_uid,
        username: u.username,
        password: u.password,
        contact: u.contact,
        email: u.email,
        station_id: u.stationId,
        event_id: u.eventId,
        invitation_token: u.invitationToken,
        status: u.status,
    };
    // Remove undefined keys
    return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
};

async function testUpdate() {
    console.log('--- TESTING USER UPDATE PAYLOAD ---');

    const mockUser = {
        id: 'test-id',
        name: 'Test Update',
        departmentId: 'd1', // App uses camelCase
        role: 'Member'
    };

    console.log('Mock User (App):', mockUser);
    const dbPayload = realMapUserToDB(mockUser);
    console.log('Mapped Payload (to DB):', dbPayload);

    if (dbPayload.departmentId === undefined && (mockUser as any).department_id === undefined) {
        console.error('FAIL: departmentId is LOST in translation!');
        console.log('Reason: UserStore maps departmentId: u.department_id, but u has u.departmentId');
    } else {
        console.log('Payload looks okay?', dbPayload);
    }
}

testUpdate();
