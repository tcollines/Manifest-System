import { apiFetch } from './api';

// Utility to convert Base64 URL-safe string to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            return registration;
        } catch (error) {
            console.error('[PushService] Service Worker registration failed:', error);
            throw error;
        }
    }
    throw new Error('Service workers are not supported by this browser');
};

export const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by this browser');
    }

    const registration = await navigator.serviceWorker.ready;

    // Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Push notification permission denied');
    }

    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
        throw new Error('VAPID public key is not configured');
    }

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // Send to backend
    await apiFetch('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription })
    });
    return subscription;
};

export const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        await apiFetch('/push/unsubscribe', {
            method: 'POST',
            body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
    }
};

export const getPushPreferences = async () => {
    const { data } = await apiFetch('/push/preferences');
    return data;
};

export const updatePushPreferences = async (preferences: any) => {
    const { data } = await apiFetch('/push/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
    });
    return data;
};

export const checkPushStatus = async () => {
    if (!('serviceWorker' in navigator)) return false;
    if (Notification.permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return !!subscription;
};
