import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://xzgdfetnjnwrberyddmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z2RmZXRuam53cmJlcnlkZG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjk4MTksImV4cCI6MjA1NzkwNTgxOX0.XJFYvBiZHo1vcfCV6Fn79C9U6LP4Vuf05PCixBWqaYU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const formatCurrency = (amount: number) => {
  return `${amount} €`;
};