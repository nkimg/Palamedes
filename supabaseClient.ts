import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjoaykcttqbjedzlqamo.supabase.co';
const supabaseKey = 'sb_publishable_ci8C-poYmN4Y0_e7GD11oQ_XBP9wNjk';

export const supabase = createClient(supabaseUrl, supabaseKey);
