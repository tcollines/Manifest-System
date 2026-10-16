import { resolve as resolveEnvPath } from 'path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: resolveEnvPath(__dirname, '.env') });

const API_URL = 'http://localhost:5000/api'; // Assuming backend is on port 5000

// Mimic Frontend EventStore mapping
const mapEventToDB = (e: any) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    date: e.date,
    time: e.time,
    location: e.location,
    description: e.description,
    stats: e.stats,
    service_number: e.serviceNumber // This is the critical field
});

const testPayload = async () => {
    console.log("--- SIMULATING FRONTEND REQUEST ---");

    // 1. Construct Event Object (as per RegistrationDashboard.tsx fix)
    const newEvent = {
        id: `evt-${Date.now()}`,
        title: "Frontend Sim Event " + Date.now(),
        type: "Service",
        date: new Date().toISOString().split('T')[0],
        time: "12:00",
        location: "Simulated Loc",
        description: "Simulated Desc",
        serviceNumber: 0, // The Fix
        stats: { attendees: 0, firstTimers: 0, soulsWon: 0, students: 0, expenditure: '$0.00', nextGen: 0 }
    };

    // 2. Map it
    const dbPayload = mapEventToDB(newEvent);
    console.log("Mapped Payload:", dbPayload);

    // 3. Send via Fetch (simulating apiFetch)
    try {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbPayload)
        });

        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }

        console.log(`Status: ${res.status}`);
        console.log("Response:", data);

    } catch (e: any) {
        console.error("Network Error:", e);
    }
};

testPayload();
