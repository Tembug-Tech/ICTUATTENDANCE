#!/usr/bin/env node
/**
 * Test Login Script - Validates all test accounts
 * Tests all credentials against Supabase authentication
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zuylnnmwdprxzaqhxogx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWxubm13ZHByeHphcWh4b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE5OTIsImV4cCI6MjA3OTE4Nzk5Mn0.Or6ViRZ1f54F7EfDnsiFSk-x4GoQQ6Okrd2XId2F3i8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test credentials from README
const testAccounts = [
  { role: 'Admin', email: 'admin@ictuniversity.edu.cm', password: 'AdminPass1!' },
  { role: 'Delegate', email: 'delegate1@ictuniversity.edu.cm', password: 'DelegatePass1!' },
  { role: 'Student', email: 'student1@ictuniversity.edu.cm', password: 'StudentPass1!' },
  { role: 'Student', email: 'student2@ictuniversity.edu.cm', password: 'StudentPass1!' },
  { role: 'Student', email: 'student3@ictuniversity.edu.cm', password: 'StudentPass1!' },
];

async function testLogin(email, password, role) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        email,
        role,
        status: '❌ FAILED',
        error: error.message,
      };
    }

    if (data?.user) {
      // Fetch user role from database
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('id, role, name, matricule')
        .eq('id', data.user.id)
        .single();

      if (dbError) {
        return {
          email,
          role,
          status: '⚠️  AUTH OK, DB ERROR',
          error: dbError.message,
          authData: data.user.email,
        };
      }

      return {
        email,
        role,
        status: '✅ SUCCESS',
        name: userData?.name || 'N/A',
        dbRole: userData?.role || 'N/A',
        matricule: userData?.matricule || 'N/A',
      };
    }

    return {
      email,
      role,
      status: '❌ FAILED',
      error: 'No user data returned',
    };
  } catch (err) {
    return {
      email,
      role,
      status: '❌ ERROR',
      error: err.message,
    };
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 LOGIN CREDENTIAL TEST - ICT University Attendance System');
  console.log('='.repeat(70) + '\n');

  const results = [];

  for (const account of testAccounts) {
    console.log(`Testing ${account.role}: ${account.email}...`);
    const result = await testLogin(account.email, account.password, account.role);
    results.push(result);

    if (result.status === '✅ SUCCESS') {
      console.log(`  ✅ LOGIN SUCCESSFUL`);
      console.log(`     Name: ${result.name}`);
      console.log(`     Role: ${result.dbRole}`);
      console.log(`     Matricule: ${result.matricule}\n`);
    } else if (result.status === '⚠️  AUTH OK, DB ERROR') {
      console.log(`  ⚠️  Authentication successful, but database error`);
      console.log(`     Error: ${result.error}\n`);
    } else {
      console.log(`  ❌ LOGIN FAILED`);
      console.log(`     Error: ${result.error}\n`);
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70) + '\n');

  const successful = results.filter((r) => r.status === '✅ SUCCESS').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${total - successful}\n`);

  // Table format
  console.log('Detailed Results:\n');
  console.table(
    results.map((r) => ({
      Role: r.role,
      Email: r.email,
      Status: r.status,
      'Info/Error': r.name || r.dbRole || r.error,
    }))
  );

  // Recommendations
  console.log('\n' + '='.repeat(70));
  console.log('📝 RECOMMENDATIONS');
  console.log('='.repeat(70) + '\n');

  const failures = results.filter((r) => r.status !== '✅ SUCCESS');

  if (failures.length === 0) {
    console.log('✅ All logins are working correctly!');
    console.log('\nYou can now test the application with:');
    console.log('  • Admin Dashboard: admin@ictuniversity.edu.cm / AdminPass1!');
    console.log('  • Student Dashboard: student1@ictuniversity.edu.cm / StudentPass1!');
    console.log('  • Delegate Dashboard: delegate1@ictuniversity.edu.cm / DelegatePass1!');
  } else {
    console.log(`⚠️  ${failures.length} account(s) have login issues:\n`);
    failures.forEach((f) => {
      console.log(`  ❌ ${f.email} - ${f.error}`);
    });
    console.log('\nPossible causes:');
    console.log('  1. Accounts not created in database');
    console.log('  2. Incorrect credentials in test data');
    console.log('  3. Supabase connection issue');
    console.log('\nSolution: Run "npm run setup-users" to create test accounts');
  }

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(failures.length === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
