import { createClient } from '@supabase/supabase-js';

// [SECURITY] Credentials must come from environment variables.
// NEVER hardcode Supabase keys in source — they end up in the compiled bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('[FATAL] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

// [FIX 2] Restore Supabase's native navigator.locks serialization guard.
// The custom bypass is scoped to Vite HMR (dev only) to avoid Chrome HMR lock freezing.
// In production, locks are handled by the SDK natively — preventing auth race conditions.
const hmrLockBypass = (import.meta as any).hot
  ? {
      lock: (...args: any[]) => {
        const acquire = args.find((a: any) => typeof a === 'function');
        return acquire ? acquire() : Promise.resolve();
      }
    }
  : {};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        ...hmrLockBypass
    },
    realtime: {
        worker: true,
        heartbeatCallback: (status: string) => {
            if (status === 'timeout' || status === 'error') {
                console.warn(`[Supabase Realtime Heartbeat] Connection status: ${status}`);
            }
        },
        params: {
            eventsPerSecond: 10
        }
    }
});
