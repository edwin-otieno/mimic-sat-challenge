// Simple script to check current egress usage
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hdnaqkziirehubztmueh.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbmFxa3ppaXJlaHVienRtdWVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTk5NTI0NywiZXhwIjoyMDYxNTcxMjQ3fQ.a7JUKTWTPiTS8sb6esznWQbmSThipGmmIHfF8NAOqb8";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function checkEgressUsage() {
  try {
    console.log('Checking current egress usage...');
    
    // Test a small query to see if we're still blocked
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .limit(1);
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      if (error.message.includes('quota') || error.message.includes('egress')) {
        console.log('🔴 Egress quota exceeded - this is blocking database operations');
      }
    } else {
      console.log('✅ Database queries are working');
      console.log('Sample data:', data);
    }
    
    // Check if we can add the teacher role now
    console.log('\nTesting teacher role addition...');
    try {
      // This will fail if teacher role doesn't exist, but we can see the error
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('role')
        .eq('role', 'teacher')
        .limit(1);
      
      if (testError) {
        console.log('Teacher role test error:', testError.message);
        if (testError.message.includes('invalid input value for enum')) {
          console.log('🔴 Teacher role still not available in enum');
        }
      } else {
        console.log('✅ Teacher role is available!');
      }
    } catch (err) {
      console.log('Teacher role test exception:', err.message);
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkEgressUsage();
