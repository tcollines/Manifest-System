async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/vehicles?eventId=f3976613-0887-4138-b2e1-63a8a5824cdd', {
            headers: {
                'Authorization': 'Bearer test-token',
                'X-Manifest-Id': '593fbdbb-8211-44ca-b3e2-8d999c88680c'
            }
        });
        const data = await response.json();
        console.log('HTTP Response Length:', data.length);
        if (data.length > 0) {
            console.log('Sample Vehicle:', data[0]);
        }
    } catch (e) { console.error(e); }
}
test();
