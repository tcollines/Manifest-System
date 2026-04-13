/**
 * Shared types for the Transportation module.
 * Kept separate to avoid circular imports.
 */
import { Vehicle } from '../../types';

export interface TrackedVehicle extends Omit<Vehicle, 'status'> {
    status?: 'Pending' | 'Approved' | 'En Route' | 'Arrived' | 'Completed';
    progress: number;
    eta: string;
    isDelayed: boolean;
}

export const TRANSPORT_DEPT_UUID = '4630e48a-f97e-48fd-a901-864b591c282f';
export const COGNITO_FORM_URL = 'https://www.cognitoforms.com/Phaneroo3/MENGATHERTransportedPrecapture';
export const PASSENGER_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
export const DEFAULT_CENTER = { lat: 0.3476, lng: 32.5825 };

export function toTrackedVehicle(v: Vehicle): TrackedVehicle {
    const stages = ['Onboarding', 'Verifying', 'RegApproval', 'FinanceApproval', 'Transit', 'Arrived'];
    const stage = v.currentStage || 'Onboarding';
    const idx = stages.indexOf(stage);
    return {
        ...v,
        status: (v.status || 'Pending') as any,
        progress: idx === -1 ? 0 : Math.round(((idx + 1) / stages.length) * 100),
        eta: `${Math.floor(Math.random() * 20) + 5} mins`,
        isDelayed: Math.random() > 0.8,
    };
}
