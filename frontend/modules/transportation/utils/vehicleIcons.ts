export function getTopDownCarIcon(type: string, bearing: number = 0): string {
    let carBody = '';
    
    // Beautiful, realistic 3D-like white car (Matches Google Maps Navigation Icon)
    const defaultCar = `
        <!-- Shadow -->
        <rect x="24" y="14" width="52" height="74" rx="16" fill="rgba(0,0,0,0.2)" />
        
        <!-- Base Car Shape (Silver/Gray for depth) -->
        <rect x="28" y="14" width="44" height="72" rx="14" fill="#D3D7DC" />
        
        <!-- Upper Car Shape (White) -->
        <rect x="31" y="16" width="38" height="68" rx="12" fill="#FFFFFF" />
        
        <!-- Windshield -->
        <path d="M 33 34 Q 50 28 67 34 L 63 41 Q 50 39 37 41 Z" fill="#75A8D3" />
        
        <!-- Rear Window -->
        <path d="M 34 66 Q 50 70 66 66 L 62 59 Q 50 61 38 59 Z" fill="#34495E" />
        
        <!-- Roof -->
        <path d="M 37 41 Q 50 39 63 41 L 62 59 Q 50 61 38 59 Z" fill="#F8F9FA" />
        
        <!-- Left Window -->
        <path d="M 31 38 L 29 48 L 29 56 L 33 63 Q 32 50 35 43 Z" fill="#34495E" />
        
        <!-- Right Window -->
        <path d="M 69 38 L 71 48 L 71 56 L 67 63 Q 68 50 65 43 Z" fill="#34495E" />
        
        <!-- Headlights -->
        <rect x="32" y="15" width="8" height="4" rx="2" fill="#E0F7FA" />
        <rect x="60" y="15" width="8" height="4" rx="2" fill="#E0F7FA" />
        
        <!-- Taillights -->
        <path d="M 31 82 Q 35 84 39 82 L 39 80 L 31 80 Z" fill="#E74C3C" />
        <path d="M 61 82 Q 65 84 69 82 L 69 80 L 61 80 Z" fill="#E74C3C" />
        
        <!-- Side Mirrors -->
        <path d="M 28 36 Q 24 36 25 40 L 29 39 Z" fill="#FFFFFF" />
        <path d="M 72 36 Q 76 36 75 40 L 71 39 Z" fill="#FFFFFF" />
    `;

    const taxiCar = `
        <!-- Shadow -->
        <rect x="24" y="14" width="52" height="74" rx="16" fill="rgba(0,0,0,0.2)" />
        
        <!-- Base Car Shape (Dark Yellow for depth) -->
        <rect x="28" y="14" width="44" height="72" rx="14" fill="#F39C12" />
        
        <!-- Upper Car Shape (Bright Yellow) -->
        <rect x="31" y="16" width="38" height="68" rx="12" fill="#F1C40F" />
        
        <!-- Windshield -->
        <path d="M 33 34 Q 50 28 67 34 L 63 41 Q 50 39 37 41 Z" fill="#75A8D3" />
        
        <!-- Rear Window -->
        <path d="M 34 66 Q 50 70 66 66 L 62 59 Q 50 61 38 59 Z" fill="#34495E" />
        
        <!-- Roof -->
        <path d="M 37 41 Q 50 39 63 41 L 62 59 Q 50 61 38 59 Z" fill="#F1C40F" />
        
        <!-- Taxi Sign -->
        <rect x="42" y="46" width="16" height="6" rx="1" fill="#FFFFFF" />
        <rect x="44" y="47" width="12" height="4" fill="#F39C12" />
        
        <!-- Left Window -->
        <path d="M 31 38 L 29 48 L 29 56 L 33 63 Q 32 50 35 43 Z" fill="#34495E" />
        
        <!-- Right Window -->
        <path d="M 69 38 L 71 48 L 71 56 L 67 63 Q 68 50 65 43 Z" fill="#34495E" />
        
        <!-- Headlights -->
        <rect x="32" y="15" width="8" height="4" rx="2" fill="#E0F7FA" />
        <rect x="60" y="15" width="8" height="4" rx="2" fill="#E0F7FA" />
        
        <!-- Taillights -->
        <path d="M 31 82 Q 35 84 39 82 L 39 80 L 31 80 Z" fill="#E74C3C" />
        <path d="M 61 82 Q 65 84 69 82 L 69 80 L 61 80 Z" fill="#E74C3C" />
        
        <!-- Side Mirrors -->
        <path d="M 28 36 Q 24 36 25 40 L 29 39 Z" fill="#F1C40F" />
        <path d="M 72 36 Q 76 36 75 40 L 71 39 Z" fill="#F1C40F" />
    `;

    const bus = `
        <!-- Shadow -->
        <rect x="22" y="6" width="56" height="88" rx="8" fill="rgba(0,0,0,0.2)" />
        
        <!-- Base Shape (Silver) -->
        <rect x="26" y="8" width="48" height="84" rx="6" fill="#D3D7DC" />
        
        <!-- Roof (White) -->
        <rect x="29" y="10" width="42" height="80" rx="4" fill="#FFFFFF" />
        
        <!-- Windshield -->
        <path d="M 28 14 Q 50 10 72 14 L 70 20 Q 50 18 30 20 Z" fill="#75A8D3" />
        
        <!-- Rear Window -->
        <path d="M 28 86 Q 50 90 72 86 L 70 80 Q 50 82 30 80 Z" fill="#34495E" />
        
        <!-- Left Side Windows -->
        <rect x="27" y="24" width="3" height="52" rx="1" fill="#34495E" />
        
        <!-- Right Side Windows -->
        <rect x="70" y="24" width="3" height="52" rx="1" fill="#34495E" />
        
        <!-- AC Units on Roof -->
        <rect x="40" y="25" width="20" height="12" rx="3" fill="#ECF0F1" stroke="#BDC3C7" stroke-width="1" />
        <rect x="40" y="60" width="20" height="12" rx="3" fill="#ECF0F1" stroke="#BDC3C7" stroke-width="1" />
        
        <!-- Headlights -->
        <rect x="28" y="9" width="8" height="3" rx="1" fill="#E0F7FA" />
        <rect x="64" y="9" width="8" height="3" rx="1" fill="#E0F7FA" />
        
        <!-- Taillights -->
        <rect x="28" y="88" width="10" height="3" rx="1" fill="#E74C3C" />
        <rect x="62" y="88" width="10" height="3" rx="1" fill="#E74C3C" />
    `;

    const boda = `
        <!-- Shadow -->
        <ellipse cx="50" cy="50" rx="14" ry="34" fill="rgba(0,0,0,0.2)" />
        
        <!-- Wheels -->
        <rect x="46" y="14" width="8" height="18" rx="4" fill="#2C3E50" />
        <rect x="45" y="68" width="10" height="20" rx="4" fill="#2C3E50" />
        
        <!-- Body Frame -->
        <rect x="47" y="30" width="6" height="44" rx="3" fill="#C0392B" />
        
        <!-- Handlebars -->
        <path d="M32 38 L68 38" stroke="#7F8C8D" stroke-width="4" stroke-linecap="round" />
        <circle cx="32" cy="38" r="2.5" fill="#2C3E50" />
        <circle cx="68" cy="38" r="2.5" fill="#2C3E50" />
        
        <!-- Seat -->
        <rect x="45" y="46" width="10" height="22" rx="4" fill="#1A252C" />
        
        <!-- Headlight -->
        <circle cx="50" cy="26" r="4.5" fill="#F1C40F" />
    `;

    const lower = type.toLowerCase();
    if (lower.includes('boda') || lower.includes('motorcycle')) {
        carBody = boda;
    } else if (lower.includes('bus') || lower.includes('coaster') || lower.includes('drone')) {
        carBody = bus;
    } else if (lower.includes('taxi') || lower.includes('cab')) {
        carBody = taxiCar;
    } else {
        carBody = defaultCar;
    }

    const svg = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(${bearing}, 50, 50)">
                ${carBody}
            </g>
        </svg>
    `.trim().replace(/\s+/g, ' ');

    const base64Svg = btoa(svg);
    return `data:image/svg+xml;base64,${base64Svg}`;
}

export function getBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
    startLat = startLat * Math.PI / 180;
    startLng = startLng * Math.PI / 180;
    destLat = destLat * Math.PI / 180;
    destLng = destLng * Math.PI / 180;

    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
        Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);

    const brng = Math.atan2(y, x);
    return ((brng * 180 / Math.PI) + 360) % 360;
}
