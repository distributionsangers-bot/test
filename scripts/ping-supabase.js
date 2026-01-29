
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function pingSupabase() {
    console.log('Pinging Supabase...');

    // Simple lightweight query to count rows in basic table (e.g. events or just check health)
    // Using a table that definitely exists, like 'events' or 'profiles'
    const { data, error } = await supabase
        .from('events')
        .select('id')
        .limit(1)
        .single();

    if (error) {
        // It's possible the table is empty or RLS prevents reading, but the request was sent essentially.
        // However, for error logging:
        if (error.code === 'PGRST116') {
            console.log('Supabase is active (query returned no rows, which is fine)');
        } else {
            console.error('Error pinging Supabase:', error.message);
            // We don't exit 1 here necessarily because we just want to wake it up
        }
    } else {
        console.log('Supabase successfully pinged!');
    }
}

pingSupabase();
