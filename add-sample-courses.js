#!/usr/bin/env node
/**
 * Add Sample Courses Script
 * Adds sample courses to the database for testing
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zuylnnmwdprxzaqhxogx.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWxubm13ZHByeHphcWh4b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE5OTIsImV4cCI6MjA3OTE4Nzk5Mn0.Or6ViRZ1f54F7EfDnsiFSk-x4GoQQ6Okrd2XId2F3i8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample courses data
const sampleCourses = [
    // Level 1 Courses
    { course_code: 'ICT101', course_title: 'Introduction to Computer Science', program: 'Information Technology', year_level: '1', instructor: 'Dr. John Smith', course_status: 'active' },
    { course_code: 'ICT102', course_title: 'Programming Fundamentals', program: 'Information Technology', year_level: '1', instructor: 'Prof. Sarah Johnson', course_status: 'active' },
    { course_code: 'ICT103', course_title: 'Database Systems', program: 'Information Technology', year_level: '1', instructor: 'Dr. Michael Brown', course_status: 'active' },
    { course_code: 'ICT104', course_title: 'Web Development Basics', program: 'Information Technology', year_level: '1', instructor: 'Ms. Emily Davis', course_status: 'active' },
    { course_code: 'ICT105', course_title: 'Computer Networks', program: 'Information Technology', year_level: '1', instructor: 'Dr. Robert Wilson', course_status: 'active' },
    { course_code: 'ICT106', course_title: 'Software Engineering', program: 'Information Technology', year_level: '1', instructor: 'Prof. Lisa Garcia', course_status: 'active' },
    { course_code: 'ICT107', course_title: 'Data Structures', program: 'Information Technology', year_level: '1', instructor: 'Dr. David Martinez', course_status: 'active' },
    { course_code: 'ICT108', course_title: 'Operating Systems', program: 'Information Technology', year_level: '1', instructor: 'Prof. Jennifer Lee', course_status: 'active' },

    // Level 2 Courses
    { course_code: 'ICT201', course_title: 'Advanced Programming', program: 'Information Technology', year_level: '2', instructor: 'Dr. John Smith', course_status: 'active' },
    { course_code: 'ICT202', course_title: 'Web Application Development', program: 'Information Technology', year_level: '2', instructor: 'Ms. Emily Davis', course_status: 'active' },
    { course_code: 'ICT203', course_title: 'Database Design', program: 'Information Technology', year_level: '2', instructor: 'Dr. Michael Brown', course_status: 'active' },
    { course_code: 'ICT204', course_title: 'Network Security', program: 'Information Technology', year_level: '2', instructor: 'Dr. Robert Wilson', course_status: 'active' },
    { course_code: 'ICT205', course_title: 'Mobile App Development', program: 'Information Technology', year_level: '2', instructor: 'Prof. Sarah Johnson', course_status: 'active' },
    { course_code: 'ICT206', course_title: 'Cloud Computing', program: 'Information Technology', year_level: '2', instructor: 'Dr. David Martinez', course_status: 'active' },
    { course_code: 'ICT207', course_title: 'Artificial Intelligence', program: 'Information Technology', year_level: '2', instructor: 'Prof. Lisa Garcia', course_status: 'active' },
    { course_code: 'ICT208', course_title: 'Cybersecurity', program: 'Information Technology', year_level: '2', instructor: 'Dr. Robert Wilson', course_status: 'active' },

    // Level 3 Courses
    { course_code: 'ICT301', course_title: 'Advanced Web Technologies', program: 'Information Technology', year_level: '3', instructor: 'Ms. Emily Davis', course_status: 'active' },
    { course_code: 'ICT302', course_title: 'Big Data Analytics', program: 'Information Technology', year_level: '3', instructor: 'Dr. Michael Brown', course_status: 'active' },
    { course_code: 'ICT303', course_title: 'Machine Learning', program: 'Information Technology', year_level: '3', instructor: 'Prof. Lisa Garcia', course_status: 'active' },
    { course_code: 'ICT304', course_title: 'Enterprise Systems', program: 'Information Technology', year_level: '3', instructor: 'Dr. David Martinez', course_status: 'active' },
    { course_code: 'ICT305', course_title: 'Blockchain Technology', program: 'Information Technology', year_level: '3', instructor: 'Dr. John Smith', course_status: 'active' },
    { course_code: 'ICT306', course_title: 'IoT and Embedded Systems', program: 'Information Technology', year_level: '3', instructor: 'Prof. Jennifer Lee', course_status: 'active' },
    { course_code: 'ICT307', course_title: 'DevOps Practices', program: 'Information Technology', year_level: '3', instructor: 'Dr. Robert Wilson', course_status: 'active' },
    { course_code: 'ICT308', course_title: 'Project Management', program: 'Information Technology', year_level: '3', instructor: 'Prof. Sarah Johnson', course_status: 'active' },

    // Level 4 Courses
    { course_code: 'ICT401', course_title: 'Capstone Project', program: 'Information Technology', year_level: '4', instructor: 'Dr. John Smith', course_status: 'active' },
    { course_code: 'ICT402', course_title: 'Advanced AI Applications', program: 'Information Technology', year_level: '4', instructor: 'Prof. Lisa Garcia', course_status: 'active' },
    { course_code: 'ICT403', course_title: 'Research Methodology', program: 'Information Technology', year_level: '4', instructor: 'Dr. Michael Brown', course_status: 'active' },
    { course_code: 'ICT404', course_title: 'Emerging Technologies', program: 'Information Technology', year_level: '4', instructor: 'Dr. David Martinez', course_status: 'active' },
    { course_code: 'ICT405', course_title: 'IT Governance', program: 'Information Technology', year_level: '4', instructor: 'Prof. Jennifer Lee', course_status: 'active' },
    { course_code: 'ICT406', course_title: 'Professional Ethics', program: 'Information Technology', year_level: '4', instructor: 'Dr. Robert Wilson', course_status: 'active' },
    { course_code: 'ICT407', course_title: 'Internship/Practicum', program: 'Information Technology', year_level: '4', instructor: 'Prof. Sarah Johnson', course_status: 'active' },
    { course_code: 'ICT408', course_title: 'Innovation and Entrepreneurship', program: 'Information Technology', year_level: '4', instructor: 'Ms. Emily Davis', course_status: 'active' }
];

async function addSampleCourses() {
    console.log('\n' + '='.repeat(70));
    console.log('📚 ADDING SAMPLE COURSES');
    console.log('='.repeat(70) + '\n');

    try {
        const results = [];

        for (const course of sampleCourses) {
            console.log(`Adding course: ${course.course_code} - ${course.course_title}...`);

            try {
                const { data, error } = await supabase
                    .from('courses')
                    .insert([course])
                    .select();

                if (error) {
                    if (error.message.includes('duplicate key') || error.message.includes('Duplicate')) {
                        console.log(`  ⚠️  Course already exists`);
                        results.push({
                            course_code: course.course_code,
                            status: '⚠️  ALREADY EXISTS',
                        });
                        continue;
                    }
                    throw error;
                }

                console.log(`  ✅ ADDED SUCCESSFULLY`);
                results.push({
                    course_code: course.course_code,
                    status: '✅ ADDED',
                });
            } catch (err) {
                console.log(`  ❌ FAILED: ${err.message}`);
                results.push({
                    course_code: course.course_code,
                    status: '❌ FAILED',
                    error: err.message,
                });
            }
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 SUMMARY');
        console.log('='.repeat(70) + '\n');

        const added = results.filter((r) => r.status === '✅ ADDED').length;
        const total = results.length;

        console.log(`Total courses: ${total}`);
        console.log(`Added: ${added}`);
        console.log(`Already exist: ${results.filter((r) => r.status.includes('EXISTS')).length}`);
        console.log(`Failed: ${results.filter((r) => r.status.includes('FAILED')).length}\n`);

        console.log('Courses by level:');
        const byLevel = {};
        sampleCourses.forEach(course => {
            if (!byLevel[course.year_level]) byLevel[course.year_level] = [];
            byLevel[course.year_level].push(course.course_code);
        });

        Object.keys(byLevel).sort().forEach(level => {
            console.log(`Level ${level}: ${byLevel[level].join(', ')}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('✅ SAMPLE COURSES ADDED');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error adding sample courses:', error);
        process.exit(1);
    }
}

// Run the script
addSampleCourses();