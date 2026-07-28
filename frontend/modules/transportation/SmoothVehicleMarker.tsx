import React, { useState, useEffect, useRef } from 'react';
import { MarkerF } from '@react-google-maps/api';
import { getTopDownCarIcon, getBearing } from './utils/vehicleIcons';
import { Vehicle } from '../../types';

// The animation duration. If DB updates every 3s, you might want this to be ~2.5s for seamlessness.
const LERP_DURATION_MS = 2500;

export function useSmoothMarker(targetLat: number, targetLng: number) {
    const [position, setPosition] = useState({ lat: targetLat, lng: targetLng });
    const [bearing, setBearing] = useState(0);
    
    // Keep track of where we started the current animation
    const startPos = useRef({ lat: targetLat, lng: targetLng });
    const animationRef = useRef<number>();

    useEffect(() => {
        // If the target hasn't meaningfully changed, don't animate.
        if (Math.abs(startPos.current.lat - targetLat) < 0.000001 && 
            Math.abs(startPos.current.lng - targetLng) < 0.000001) {
            return;
        }

        const startLat = position.lat;
        const startLng = position.lng;
        
        // Calculate the direction the vehicle should face
        const newBearing = getBearing(startLat, startLng, targetLat, targetLng);
        setBearing(newBearing);

        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            
            // Calculate percentage of completion (0.0 to 1.0)
            const percent = Math.min(progress / LERP_DURATION_MS, 1);

            // Calculate the interpolated position
            const currentLat = startLat + (targetLat - startLat) * percent;
            const currentLng = startLng + (targetLng - startLng) * percent;

            setPosition({ lat: currentLat, lng: currentLng });

            if (percent < 1) {
                // If not done, keep animating next frame
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // Done! Update the startPos to the final target
                startPos.current = { lat: targetLat, lng: targetLng };
            }
        };

        // Cancel any existing animation before starting a new one
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [targetLat, targetLng]);

    return { position, bearing };
}

interface SmoothVehicleMarkerProps {
    vehicle: Vehicle;
    label?: any;
    title?: string;
    onClick?: () => void;
}

export const SmoothVehicleMarker: React.FC<SmoothVehicleMarkerProps> = ({ vehicle, label, title, onClick }) => {
    // If the vehicle doesn't have a valid location yet, do not render
    if (!vehicle.location || vehicle.location.lat === undefined || vehicle.location.lng === undefined) {
        return null;
    }

    const lat = Number(vehicle.location.lat);
    const lng = Number(vehicle.location.lng);

    const { position, bearing } = useSmoothMarker(lat, lng);

    return (
        <MarkerF
            position={position}
            label={label}
            title={title}
            onClick={onClick}
            icon={{
                url: getTopDownCarIcon(vehicle.type, bearing),
                scaledSize: typeof window !== 'undefined' && (window as any).google ? new (window as any).google.maps.Size(60, 60) : undefined,
                anchor: typeof window !== 'undefined' && (window as any).google ? new (window as any).google.maps.Point(30, 30) : undefined,
                labelOrigin: typeof window !== 'undefined' && (window as any).google ? new (window as any).google.maps.Point(30, 75) : undefined
            }}
        />
    );
};
