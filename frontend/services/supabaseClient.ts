import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poazorjmzswectxvakzl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXpvcmptenN3ZWN0eHZha3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTEyNjgsImV4cCI6MjA4MjM4NzI2OH0.63UUyttqrMAvPYeiA2IIqPxTnk_WftlMLTKQ99Ejv-A';

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
    }
});
