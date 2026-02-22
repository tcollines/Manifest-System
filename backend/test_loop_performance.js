// Load test O(N * M) arrays
function testPerformance() {
    console.log("Generating 5000 passengers and 3000 attendees...");
    const directAttendees = [];
    const passengerAttendees = [];

    for (let i = 0; i < 3000; i++) {
        directAttendees.push({
            name: `User ${i}`,
            phone: `123456789${i}`
        });
    }

    for (let i = 0; i < 5000; i++) {
        passengerAttendees.push({
            name: `Passenger ${i}`,
            phone: `123456789${i}`
        });
    }

    console.log("Starting O(N*M) loop test...");
    const start = performance.now();
    const allAttendees = [...directAttendees];

    passengerAttendees.forEach(p => {
        const isAlreadyCheckedIn = directAttendees.some(d =>
            d.phone === p.phone && d.name.toLowerCase() === p.name.toLowerCase()
        );

        if (!isAlreadyCheckedIn) {
            allAttendees.push(p);
        }
    });
    const end = performance.now();
    console.log(`BEFORE (O(N*M)): ${(end - start).toFixed(2)} ms for 1 Request.`);
    console.log(`If 50 users request this concurrently, the backend will freeze for ${((end - start) * 50).toFixed(2)} ms (${(((end - start) * 50) / 1000).toFixed(2)} seconds).`);

    // Simulate After (Hash Map optimization if SQL RPC isn't available)
    console.log("\nStarting O(N) Hash Map test...");
    const startHash = performance.now();
    const allAttendeesHash = [...directAttendees];

    const checkedInSet = new Set(directAttendees.map(d => `${d.phone}_${d.name.toLowerCase()}`));

    passengerAttendees.forEach(p => {
        if (!checkedInSet.has(`${p.phone}_${p.name.toLowerCase()}`)) {
            allAttendeesHash.push(p);
        }
    });

    const endHash = performance.now();
    console.log(`AFTER (O(N) Set): ${(endHash - startHash).toFixed(2)} ms for 1 Request.`);
}

testPerformance();
