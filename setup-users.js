#!/usr/bin/env node
/**
 * Setup Test Users Script
 * Creates test accounts in Supabase for development
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zuylnnmwdprxzaqhxogx.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWxubm13ZHByeHphcWh4b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE5OTIsImV4cCI6MjA3OTE4Nzk5Mn0.Or6ViRZ1f54F7EfDnsiFSk-x4GoQQ6Okrd2XId2F3i8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test accounts to create
const testUsers = [
  {
    email: 'admin@ictuniversity.edu.cm',
    password: 'AdminPass1!',
    role: 'admin',
    name: 'System Admin',
    matricule: 'ADM001',
  },
  {
    email: 'delegate1@ictuniversity.edu.cm',
    password: 'DelegatePass1!',
    role: 'delegate',
    name: 'Delegate One',
    matricule: 'DEL001',
  },
  {
    email: 'student1@ictuniversity.edu.cm',
    password: 'StudentPass1!',
    role: 'student',
    name: 'Student One',
    matricule: 'STD001',
  },
  {
    email: 'student2@ictuniversity.edu.cm',
    password: 'StudentPass1!',
    role: 'student',
    name: 'Student Two',
    matricule: 'STD002',
  },
  {
    email: 'student3@ictuniversity.edu.cm',
    password: 'StudentPass1!',
    role: 'student',
    name: 'Student Three',
    matricule: 'STD003',
  },
];

async function createUsers() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 SETTING UP TEST USER ACCOUNTS');
  console.log('='.repeat(70) + '\n');

  const results = [];

  for (const user of testUsers) {
    console.log(`Creating ${user.role}: ${user.email}...`);

    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already exists')) {
          console.log(`  ⚠️  User already exists, updating...`);
          results.push({
            email: user.email,
            role: user.role,
            status: '⚠️  ALREADY EXISTS',
          });
          continue;
        }
        throw authError;
      }

      // 2. Add user to database with role
      const { data: dbData, error: dbError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          matricule: user.matricule,
        },
      ]);

      if (dbError) {
        // Check if already exists
        if (dbError.message.includes('duplicate key') || dbError.message.includes('Duplicate')) {
          console.log(`  ⚠️  Database record already exists`);
          results.push({
            email: user.email,
            role: user.role,
            status: '✅ EXISTS (skip)',
          });
          continue;
        }
        throw dbError;
      }

      console.log(`  ✅ CREATED SUCCESSFULLY`);
      results.push({
        email: user.email,
        role: user.role,
        status: '✅ CREATED',
      });
    } catch (err) {
      console.log(`  ❌ FAILED: ${err.message}`);
      results.push({
        email: user.email,
        role: user.role,
        status: '❌ FAILED',
        error: err.message,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SETUP SUMMARY');
  console.log('='.repeat(70) + '\n');

  const created = results.filter((r) => r.status === '✅ CREATED').length;
  const total = results.length;

  console.log(`Total: ${total}`);
  console.log(`Created: ${created}`);
  console.log(`Already Exist: ${results.filter((r) => r.status.includes('EXISTS')).length}`);
  console.log(`Failed: ${results.filter((r) => r.status.includes('FAILED')).length}\n`);

  console.log('Test Accounts:\n');
  console.table(
    results.map((r) => ({
      Role: r.role,
      Email: r.email,
      Status: r.status,
    }))
  );

  console.log('\n' + '='.repeat(70));
  console.log('✅ SETUP COMPLETE');
  console.log('='.repeat(70) + '\n');

  console.log('You can now log in with any of these credentials:\n');
  testUsers.forEach((u) => {
    console.log(`  ${u.role.toUpperCase()}: ${u.email}`);
    console.log(`            Password: ${u.password}\n`);
  });

  const failures = results.filter((r) => r.status === '❌ FAILED').length;
  process.exit(failures > 0 ? 1 : 0);
}

// Run setup with admin API (requires service role key)
async function setupWithServiceRole() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 SETTING UP TEST USER ACCOUNTS (Service Role)');
  console.log('='.repeat(70) + '\n');

  // Use service role key for admin operations
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWxubm13ZHByeHphcWh4b2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYxMTk5MiwiZXhwIjoyMDc5MTg3OTkyfQ.bNs8KI3ZaMiSK7uX3tZH3h-RJzx64bHNL7eo8R4JNdk';

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const results = [];

  for (const user of testUsers) {
    console.log(`Creating ${user.role}: ${user.email}...`);

    try {
      // Create auth user with admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.log(`  ⚠️  User already exists, skipping...`);
          results.push({
            email: user.email,
            role: user.role,
            status: '⚠️  EXISTS',
          });
          continue;
        }
        throw authError;
      }

      // Insert user record in database
      const { error: dbError } = await supabaseAdmin.from('users').insert([
        {
          id: authData.user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          matricule: user.matricule,
        },
      ]);

      if (dbError) {
        if (dbError.message.includes('duplicate')) {
          console.log(`  ⚠️  Database record already exists`);
          results.push({
            email: user.email,
            role: user.role,
            status: '⚠️  EXISTS',
          });
          continue;
        }
        throw dbError;
      }

      console.log(`  ✅ CREATED SUCCESSFULLY`);
      results.push({
        email: user.email,
        role: user.role,
        status: '✅ CREATED',
      });
    } catch (err) {
      console.log(`  ❌ FAILED: ${err.message}`);
      results.push({
        email: user.email,
        role: user.role,
        status: '❌ FAILED',
        error: err.message,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SETUP SUMMARY');
  console.log('='.repeat(70) + '\n');

  const created = results.filter((r) => r.status === '✅ CREATED').length;

  console.log(`Total Users: ${testUsers.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${results.filter((r) => r.status.includes('EXISTS')).length}\n`);

  console.log('Detailed Results:\n');
  console.table(
    results.map((r) => ({
      Role: r.role,
      Email: r.email,
      Status: r.status,
    }))
  );

  console.log('\n' + '='.repeat(70));
  console.log('✅ SETUP COMPLETE');
  console.log('='.repeat(70) + '\n');

  console.log('Test Credentials:\n');
  testUsers.forEach((u) => {
    console.log(`${u.role.toUpperCase()}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Password: ${u.password}\n`);
  });

  const failures = results.filter((r) => r.status === '❌ FAILED').length;
  process.exit(failures > 0 ? 1 : 0);
}

// Run setup
setupWithServiceRole().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
