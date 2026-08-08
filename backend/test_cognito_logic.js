const cognitoFormUrl = 'https://www.cognitoforms.com/Phaneroo3/12thAnniversaryprecapture';

const createSamplePassengers = (count) => Array.from({ length: count }, (_, i) => ({
    name: `Passenger ${i + 1} Name`,
    contact: `+2567701234${(i + 10).toString().padStart(2, '0')}`,
    category: 'Member',
    isFirstTime: i % 2 === 0 ? 'Yes' : 'No'
}));

console.log("=== PASSENGER COUNT VS URL LENGTH ===");

for (let count = 10; count <= 20; count++) {
    const passengers = createSamplePassengers(count);
    const basePayload = {
        CordinatorsContactInformation: {
            Name: { First: 'Aine', Last: 'Francis' },
            Phone: '+256754332211',
            Region: 'Central',
            NameOfRegionManifest: 'Manifest Entebbe',
            VehicleNumberPlate: 'UA 999YU'
        },
        ListOfTransportedPeople: []
    };

    const mappedPassengers = passengers.map(p => ({
        Name: p.name,
        Phone: p.contact.replace(/\D/g, ''),
        ...(p.isFirstTime === 'Yes' ? { FirstTimer: true } : {}),
        Department: 'Residential'
    }));

    const fullPayload = {
        ...basePayload,
        ListOfTransportedPeople: mappedPassengers
    };

    const fullUrl = `${cognitoFormUrl}?entry=${encodeURIComponent(JSON.stringify(fullPayload))}`;
    const fits = fullUrl.length <= 2500;
    console.log(`${count} Passengers -> URL Length: ${fullUrl.length} chars | Fits (≤ 2500): ${fits ? '✅ YES' : '❌ NO'}`);
}
