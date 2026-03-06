import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0 && !key.startsWith('#')) {
    acc[key.trim()] = values.join('=').trim();
  }
  return acc;
}, {} as any);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Create two clients: one simulating the browser (anon), one for admin privileges (service_role)
const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey);

const TEST_EMAIL = 'qa_test_admin@test.com';
const TEST_PASS = 'TestPassword123!';

async function runQATest() {
  console.log('--- STARTING QA TEST ---');

  // Step 1: Ensure RLS blocks anonymous access
  console.log('\n[TEST 1] Testing Anonymous Access (Should be blocked/return 0 items)');
  const { data: anonData, error: anonError } = await anonClient.from('instagram_messages').select('*');
  console.log(`Anonymous Data Count: ${anonData?.length || 0}`);
  if (anonData?.length === 0) {
    console.log('✅ PASS: Anonymous access correctly blocked by RLS.');
  } else {
    console.error('❌ FAIL: Anonymous users can see data!');
  }

  // Step 2: Create auto-confirmed test user (Simulating hitting the Sign Up button but handling email confirmation locally)
  console.log('\n[TEST 2] Setting up Test Account');
  
  // Clean up if it exists from previous tests
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL);
  if (existingUser) {
    await adminClient.auth.admin.deleteUser(existingUser.id);
  }

  // Create user directly via admin API to auto-confirm email for this automated test
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASS,
    email_confirm: true // bypass email verification for script QA
  });

  if (createError) {
    console.error('❌ FAIL: Failed to create test user:', createError.message);
    return;
  }
  console.log('✅ PASS: Setup test account successfully.');

  // Step 3: Authenticate the anon client with the newly created account
  console.log('\n[TEST 3] Authenticating as Admin User');
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });

  if (authError || !authData.session) {
    console.error('❌ FAIL: Failed to log in as test user:', authError?.message);
    return;
  }
  console.log('✅ PASS: Successfully authenticated and received session token.');

  // Step 4: Fetch data as authenticated user
  console.log('\n[TEST 4] Fetching Instagram Messages as Authenticated User');
  const { data: authMessages, error: messagesError } = await anonClient.from('instagram_messages').select('*');
  
  if (messagesError) {
    console.error('❌ FAIL: Failed to fetch messages:', messagesError.message);
  } else {
    console.log(`Authenticated Data Count: ${authMessages?.length}`);
    if (authMessages && authMessages.length > 0) {
      console.log('✅ PASS: Authenticated user successfully retrieved messages from database!');
      console.log('Sample Message:', authMessages[0].message);
    } else {
      console.log('⚠️ WARNING: Successful query, but no messages exist in the database (or count is 0).');
    }
  }

  console.log('\n--- QA TEST COMPLETE ---');
}

runQATest();
