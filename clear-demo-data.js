#!/usr/bin/env node
/**
 * Clear Demo Data Script
 * Removes all demo sessions, attendance records, and related data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zuylnnmwdprxzaqhxogx.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWxubm13ZHByeHphcWh4b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE5OTIsImV4cCI6MjA3OTE4Nzk5Mn0.Or6ViRZ1f54F7EfDnsiFSk-x4GoQQ6Okrd2XId2F3i8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDemoData() {
    console.log('\n' + '='.repeat(70));
    console.log('🧹 CLEARING DEMO DATA');
    console.log('='.repeat(70) + '\n');

    try {
        // Clear data in order of dependencies (reverse of creation)

        // 1. Clear attendance records
        console.log('Clearing attendance records...');
        const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (attendanceError) {
            console.log(`  ❌ Failed to clear attendance: ${attendanceError.message}`);
        } else {
            console.log(`  ✅ Cleared attendance records`);
        }

        // 2. Clear sessions
        console.log('Clearing sessions...');
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('sessions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (sessionsError) {
            console.log(`  ❌ Failed to clear sessions: ${sessionsError.message}`);
        } else {
            console.log(`  ✅ Cleared sessions`);
        }

        // 3. Clear classes
        console.log('Clearing classes...');
        const { data: classesData, error: classesError } = await supabase
            .from('classes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (classesError) {
            console.log(`  ❌ Failed to clear classes: ${classesError.message}`);
        } else {
            console.log(`  ✅ Cleared classes`);
        }

        // 4. Clear enrollments
        console.log('Clearing enrollments...');
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('enrollments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (enrollmentsError) {
            console.log(`  ❌ Failed to clear enrollments: ${enrollmentsError.message}`);
        } else {
            console.log(`  ✅ Cleared enrollments`);
        }

        // 5. Clear courses (be careful - this removes all courses)
        console.log('Clearing courses...');
        const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (coursesError) {
            console.log(`  ❌ Failed to clear courses: ${coursesError.message}`);
        } else {
            console.log(`  ✅ Cleared courses`);
        }

        // Note: Not clearing users as they are linked to Supabase Auth
        // If you want to clear users, you need to do it through Supabase dashboard or API

        console.log('\n' + '='.repeat(70));
        console.log('✅ DEMO DATA CLEARED');
        console.log('='.repeat(70));
        console.log('Note: Users were not cleared as they are linked to Supabase Auth.');
        console.log('You can now add real courses, classes, and sessions through the admin dashboard.');

    } catch (error) {
        console.error('❌ Error clearing demo data:', error);
        process.exit(1);
    }
}

// Run the script
clearDemoData();