import 'server-only';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const adminDb = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

export function requireDatabase() {
  if (!adminDb) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL before saving.');
  return adminDb;
}
