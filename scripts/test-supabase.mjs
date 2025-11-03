/**
 * Test Supabase connection
 */
import { createSupabaseServiceClient } from '../lib/storage.js';

async function testSupabase() {
  try {
    console.log('[test] Creating Supabase client...');
    const client = createSupabaseServiceClient();
    console.log('✅ Supabase client created successfully');
    
    console.log('[test] Testing connection...');
    const { data, error } = await client.storage.listBuckets();
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connection working, buckets:', data?.length || 0);
    }
  } catch (error) {
    console.log('❌ Supabase client creation failed:', error.message);
  }
}

testSupabase();

