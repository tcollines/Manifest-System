
import fetch from 'node-fetch';

const testEvents = async () => {
    try {
        console.log("Fetching http://localhost:5000/api/events...");
        const res = await fetch('http://localhost:5000/api/events');

        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Body:", text);
            return;
        }

        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Body:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Request Failed:", e);
    }
};

testEvents();
