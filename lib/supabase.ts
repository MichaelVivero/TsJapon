import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfmdhpjagyprjgvqifmn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmbWRocGphZ3lwcmpndnFpZm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDc4ODAsImV4cCI6MjA4NzgyMzg4MH0.64E9B901UhpQBFEzcuxhcAbJ8U6MTL7ckWfLV4kIDSs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);