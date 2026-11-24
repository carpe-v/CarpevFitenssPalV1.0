import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://hqrelmjdtsrojzpwbimj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d9IxxwGBmQyynxL107arWg_rosQB-OI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);