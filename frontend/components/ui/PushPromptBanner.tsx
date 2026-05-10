/**
 * PushPromptBanner
 *
 * Shows a non-intrusive bottom banner asking the user to enable push notifications
 * if they haven't already. Appears once per session, 3 seconds after login.
 * Stores dismissal in localStorage so it doesn't re-appear after the user
 * explicitly dismisses it (for 7 days).
 */
import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeToPush, checkPushStatus, registerServiceWorker } from '../../services/pushService';

const DISMISS_KEY = 'push_prompt_dismissed_until';
const DISMISS_DAYS = 7;

export const PushPromptBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only run on browsers that support push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        // Don't show if permission already denied — system won't let us ask again
        if ('Notification' in window && Notification.permission === 'denied') return;

        const dismissedUntil = localStorage.getItem(DISMISS_KEY);
        if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

        // Delay check so it doesn't flash on every navigation
        const timer = setTimeout(async () => {
            try {
                // Register SW first (idempotent)
                await registerServiceWorker();
                const alreadySubscribed = await checkPushStatus();
                if (!alreadySubscribed) {
                    setVisible(true);
                }
            } catch {
                // Silently ignore — don't interrupt the user
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            await subscribeToPush();
            setVisible(false);
        } catch (e: any) {
            // If permission was denied, suppress for a long time
            const days = e?.message?.includes('denied') ? 30 : DISMISS_DAYS;
            localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000));
            setVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="alert"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-md
                       bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-700
                       flex items-center gap-3 px-4 py-3 animate-in slide-in-from-bottom-4 duration-300"
        >
            <div className="shrink-0 w-9 h-9 rounded-full bg-ministry-orange/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-ministry-orange" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">Enable push notifications</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    Get instant alerts for requisitions and approvals on this device.
                </p>
            </div>

            <button
                onClick={handleEnable}
                disabled={loading}
                className="shrink-0 text-xs font-bold bg-ministry-orange hover:bg-orange-500
                           text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
                {loading ? '...' : 'Enable'}
            </button>

            <button
                onClick={handleDismiss}
                className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors p-1"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
