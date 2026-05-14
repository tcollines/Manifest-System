import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Service-role client — bypasses the custom_access_token_hook
const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── POST /forms/auth/signup ──────────────────────────────────────────────────
// Creates a Supabase auth user using the service-role key, which bypasses
// the custom_access_token_hook that blocks users not in public.users.
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, and full_name are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Use admin API to create the user — this skips the hook entirely
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true, // auto-confirm so users can log in immediately
    });

    if (error) {
      // Handle "user already exists" gracefully
      if (error.message?.toLowerCase().includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name ?? full_name,
        created_at: data.user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Forms] Signup error:', err.message);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

export default router;
