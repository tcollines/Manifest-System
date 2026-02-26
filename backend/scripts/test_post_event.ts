
import axios from 'axios';

async function test() {
    console.log('--- Testing Event Creation ---');
    try {
        const response = await axios.post('http://localhost:5000/api/events', {
            title: 'DEBUG_TEST_EVENT',
            type: 'Service',
            date: '2026-02-11',
            time: '12:00',
            location: 'DEBUG',
            service_number: 1
        });
        console.log('✅ Success:', response.status, response.data);
    } catch (error: any) {
        if (error.response) {
            console.log('❌ Error Response:', error.response.status, error.response.data);
        } else {
            console.log('❌ Request Failed:', error.message);
        }
    }
}

test();
