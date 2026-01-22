import { supabase } from '../supabase/supabase';

// ============================================
// ADMIN DASHBOARD QUERIES
// ============================================

export const adminFetchStats = async () => {
  try {
    const [
      { count: studentCount, error: studentError },
      { count: delegateCount, error: delegateError },
      { count: courseCount, error: courseError },
      { count: classCount, error: classError }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'student'),
      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'delegate'),
      supabase
        .from('courses')
        .select('id', { count: 'exact' }),
      supabase
        .from('classes')
        .select('id', { count: 'exact' })
    ]);

    const today = new Date().toISOString().split('T')[0];
    const { data: todaySessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_date', today);

    if (studentError || delegateError || courseError || classError || sessionsError) {
      throw new Error('Failed to fetch stats');
    }

    return {
      totalStudents: studentCount || 0,
      totalDelegates: delegateCount || 0,
      totalCourses: courseCount || 0,
      totalClasses: classCount || 0,
      sessionsToday: (todaySessions || []).length,
      error: null
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      totalStudents: 0,
      totalDelegates: 0,
      totalCourses: 0,
      totalClasses: 0,
      sessionsToday: 0,
      error: error.message
    };
  }
};

export const adminFetchOpenSessions = async () => {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        token,
        expires_at,
        classes!inner (
          id,
          class_name,
          delegate_id,
          users!delegate_id (name),
          courses!inner (course_code, course_title)
        )
      `)
      .order('session_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Return all sessions with calculated status
    const allSessions = (sessions || []).map(session => {
      // Calculate status based on Cameroon time
      const now = new Date();
      const sessionDate = session.session_date;
      const [startHour, startMin] = session.start_time.split(':').map(Number);
      const [endHour, endMin] = session.end_time.split(':').map(Number);

      const startDateTimeUTC = new Date(sessionDate);
      startDateTimeUTC.setHours(startHour, startMin, 0, 0);
      startDateTimeUTC.setTime(startDateTimeUTC.getTime() - (1 * 60 * 60 * 1000));

      const endDateTimeUTC = new Date(sessionDate);
      endDateTimeUTC.setHours(endHour, endMin, 0, 0);
      endDateTimeUTC.setTime(endDateTimeUTC.getTime() - (1 * 60 * 60 * 1000));

      const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

      let status = 'Closed';
      if (nowUTC < startDateTimeUTC) {
        status = 'Scheduled';
      } else if (nowUTC >= startDateTimeUTC && nowUTC < endDateTimeUTC) {
        status = 'Open';
      }

      return {
        id: session.id,
        className: session.classes?.courses?.course_title || 'Unknown',
        courseCode: session.classes?.courses?.course_code || 'N/A',
        delegateName: session.classes?.users?.name || 'Unknown',
        date: new Date(session.session_date).toLocaleDateString(),
        startTime: session.start_time,
        endTime: session.end_time,
        status: status,
        tokenPreview: session.token?.slice(0, 8).toUpperCase() || 'N/A'
      };
    });

    return { sessions: allSessions, error: null };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { sessions: [], error: error.message };
  }
};

export const adminFetchCourseAttendance = async (limit = 10) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, course_code, course_title')
      .limit(limit);

    if (error) throw error;

    const courseStats = await Promise.all(
      (courses || []).map(async (course) => {
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', course.id);

        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id', { count: 'exact' })
          .eq('classes.course_id', course.id);

        const { data: attendance } = await supabase
          .from('attendance')
          .select('id')
          .in('session_id', (sessions || []).map(s => s.id));

        const enrollmentCount = (enrollments || []).length;
        const totalAttendance = (attendance || []).length;
        const percentage = enrollmentCount > 0 ? Math.round((totalAttendance / enrollmentCount) * 100) : 0;

        return {
          id: course.id,
          courseCode: course.course_code,
          courseTitle: course.course_title,
          enrolledStudents: enrollmentCount,
          totalAttendance,
          attendancePercentage: percentage,
          status: percentage >= 80 ? 'Good' : percentage >= 60 ? 'Fair' : 'Low'
        };
      })
    );

    return { courseAttendance: courseStats, error: null };
  } catch (error) {
    console.error('Error fetching course attendance:', error);
    return { courseAttendance: [], error: error.message };
  }
};

export const adminFetchAttendanceAlerts = async () => {
  try {
    const threshold = 75; // 75% attendance threshold
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id, course_id');

    if (enrollError) throw enrollError;

    const alerts = [];

    for (const enrollment of (enrollments || [])) {
      // Get sessions for this course
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('class_id', (
          await supabase
            .from('classes')
            .select('id')
            .eq('course_id', enrollment.course_id)
        ).data?.map(c => c.id) || []);

      // Count attendance for this student in these sessions
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('id', { count: 'exact' })
        .eq('student_id', enrollment.student_id)
        .in('session_id', (sessions || []).map(s => s.id));

      const percentage = (sessions?.length || 0) > 0 ? (attendanceCount / sessions.length) * 100 : 0;

      if (percentage < threshold) {
        const { data: student } = await supabase
          .from('users')
          .select('name, matricule')
          .eq('id', enrollment.student_id)
          .single();

        const { data: course } = await supabase
          .from('courses')
          .select('course_title, course_code')
          .eq('id', enrollment.course_id)
          .single();

        alerts.push({
          type: 'low-attendance',
          severity: percentage < 60 ? 'critical' : 'warning',
          studentName: student?.name || 'Unknown',
          studentId: enrollment.student_id,
          courseTitle: course?.course_title || 'Unknown',
          courseCode: course?.course_code || 'N/A',
          attendance: `${Math.round(percentage)}%`,
          message: `${student?.name || 'Student'} has ${Math.round(percentage)}% attendance in ${course?.course_title || 'Course'}`
        });
      }
    }

    // Check for expired sessions
    const { data: expiredSessions } = await supabase
      .from('sessions')
      .select('id, expires_at, classes!inner(class_name)')
      .lt('expires_at', new Date().toISOString());

    (expiredSessions || []).forEach(session => {
      alerts.push({
        type: 'expired-session',
        severity: 'warning',
        message: `Session for ${session.classes?.class_name || 'Class'} was left open beyond allowed time`,
        sessionId: session.id
      });
    });

    return { alerts, error: null };
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { alerts: [], error: error.message };
  }
};

// ============================================
// DELEGATE DASHBOARD QUERIES
// ============================================

export const delegateFetchAssignedClasses = async (delegateId) => {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        class_name,
        level,
        course_id,
        courses!inner (
          id,
          course_code,
          course_title,
          program,
          year_level
        )
      `)
      .eq('delegate_id', delegateId);

    if (error) throw error;

    const classesWithSessions = await Promise.all(
      (classes || []).map(async (cls) => {
        const today = new Date().toISOString().split('T')[0];
        const { data: todaySession } = await supabase
          .from('sessions')
          .select('id, status, start_time, end_time')
          .eq('class_id', cls.id)
          .eq('session_date', today)
          .limit(1);

        return {
          id: cls.id,
          className: cls.class_name,
          level: cls.level,
          courseCode: cls.courses?.course_code,
          courseTitle: cls.courses?.course_title,
          program: cls.courses?.program,
          yearLevel: cls.courses?.year_level,
          sessionToday: (todaySession || []).length > 0 ? 'Open' : 'None',
          hasActiveSession: (todaySession || []).length > 0
        };
      })
    );

    return { classes: classesWithSessions, error: null };
  } catch (error) {
    console.error('Error fetching assigned classes:', error);
    return { classes: [], error: error.message };
  }
};

export const delegateFetchAssignedCourses = async (delegateId) => {
  try {
    const { data: courses, error } = await supabase
      .from('classes')
      .select(`
        courses!inner (
          id,
          course_code,
          course_title,
          program,
          year_level
        )
      `)
      .eq('delegate_id', delegateId);

    if (error) throw error;

    // Remove duplicates
    const uniqueCourses = [];
    const seen = new Set();
    (courses || []).forEach(item => {
      if (item.courses && !seen.has(item.courses.id)) {
        seen.add(item.courses.id);
        uniqueCourses.push({
          id: item.courses.id,
          courseCode: item.courses.course_code,
          courseTitle: item.courses.course_title,
          program: item.courses.program,
          yearLevel: item.courses.year_level
        });
      }
    });

    return {
      courses: uniqueCourses,
      error: null
    };
  } catch (error) {
    console.error('Error fetching assigned courses:', error);
    return { courses: [], error: error.message };
  }
};

export const delegateFetchSessions = async (delegateId) => {
  try {
    // Fetch ALL sessions (not just for delegate's classes) so delegates can see admin-created sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        token,
        expires_at,
        classes!inner (
          id,
          class_name,
          delegate_id,
          courses!inner (course_code, course_title),
          users!delegate_id (name)
        )
      `)
      .order('session_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    const enrichedSessions = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count: attendanceCount } = await supabase
          .from('attendance')
          .select('id', { count: 'exact' })
          .eq('session_id', session.id);

        return {
          id: session.id,
          className: session.classes?.class_name,
          courseTitle: session.classes?.courses?.course_title,
          courseCode: session.classes?.courses?.course_code,
          delegateName: session.classes?.users?.name || 'Admin',
          date: new Date(session.session_date).toLocaleDateString(),
          startTime: session.start_time,
          endTime: session.end_time,
          status: new Date(session.expires_at) > new Date() ? 'Open' : 'Closed',
          attendanceCount: attendanceCount || 0,
          token: session.token,
          isOwnClass: session.classes?.delegate_id === delegateId
        };
      })
    );

    return { sessions: enrichedSessions, error: null };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { sessions: [], error: error.message };
  }
};

export const delegateFetchSessionAttendance = async (sessionId) => {
  try {
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select(`
        id,
        created_at,
        users!student_id (
          id,
          name,
          matricule
        )
      `)
      .eq('session_id', sessionId);

    if (error) throw error;

    return {
      attendance: (attendance || []).map(a => ({
        id: a.id,
        studentName: a.users?.name,
        studentMatricule: a.users?.matricule,
        timestamp: new Date(a.created_at).toLocaleTimeString(),
        status: 'Present'
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching session attendance:', error);
    return { attendance: [], error: error.message };
  }
};

export const delegateFetchStats = async (delegateId) => {
  try {
    // Get stats for delegate's own classes
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('delegate_id', delegateId);

    const classIds = (classes || []).map(c => c.id);

    const { data: ownSessions } = await supabase
      .from('sessions')
      .select('id, expires_at')
      .in('class_id', classIds);

    const now = new Date();
    const activeSessions = (ownSessions || []).filter(s => new Date(s.expires_at) > now);

    const { count: totalAttendance } = await supabase
      .from('attendance')
      .select('id', { count: 'exact' })
      .in('session_id', (ownSessions || []).map(s => s.id));

    const today = new Date().toISOString().split('T')[0];
    const { data: todaySessions } = await supabase
      .from('sessions')
      .select('id')
      .in('class_id', classIds)
      .eq('session_date', today);

    return {
      activeSessions: activeSessions.length,
      totalSessions: ownSessions?.length || 0,
      totalMarked: totalAttendance || 0,
      todaySessions: (todaySessions || []).length,
      error: null
    };
  } catch (error) {
    console.error('Error fetching delegate stats:', error);
    return {
      activeSessions: 0,
      totalSessions: 0,
      totalMarked: 0,
      todaySessions: 0,
      error: error.message
    };
  }
};

// ============================================
// STUDENT DASHBOARD QUERIES
// ============================================

export const studentFetchEnrolledCourses = async (studentId) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        courses!inner (
          id,
          course_code,
          course_title,
          program,
          year_level
        )
      `)
      .eq('student_id', studentId);

    if (error) throw error;

    return {
      courses: (enrollments || []).map(e => ({
        id: e.courses?.id,
        courseCode: e.courses?.course_code,
        courseTitle: e.courses?.course_title,
        program: e.courses?.program,
        yearLevel: e.courses?.year_level,
        enrollmentId: e.id
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    return { courses: [], error: error.message };
  }
};

export const studentFetchActiveSessions = async (studentId) => {
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const courseIds = (enrollments || []).map(e => e.course_id);

    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .in('course_id', courseIds);

    const classIds = (classes || []).map(c => c.id);
    const now = new Date();

    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        expires_at,
        token,
        classes!inner (
          id,
          class_name,
          delegate_id,
          users!delegate_id (name),
          courses!inner (course_code, course_title)
        )
      `)
      .in('class_id', classIds)
      .gt('expires_at', now.toISOString());

    if (sessionError) throw sessionError;

    // Check which sessions student has already marked
    const { data: studentAttendance } = await supabase
      .from('attendance')
      .select('session_id')
      .eq('student_id', studentId)
      .in('session_id', (sessions || []).map(s => s.id));

    const markedSessionIds = (studentAttendance || []).map(a => a.session_id);

    return {
      sessions: (sessions || []).map(s => ({
        id: s.id,
        courseCode: s.classes?.courses?.course_code,
        courseTitle: s.classes?.courses?.course_title,
        className: s.classes?.class_name,
        delegateName: s.classes?.users?.name,
        date: new Date(s.session_date).toLocaleDateString(),
        startTime: s.start_time,
        endTime: s.end_time,
        token: s.token,
        isMarked: markedSessionIds.includes(s.id),
        status: 'Open'
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return { sessions: [], error: error.message };
  }
};

export const studentFetchAttendanceSummary = async (studentId) => {
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const courseIds = (enrollments || []).map(e => e.course_id);

    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .in('course_id', courseIds);

    const classIds = (classes || []).map(c => c.id);

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .in('class_id', classIds);

    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .in('session_id', (sessions || []).map(s => s.id));

    const totalSessions = (sessions || []).length;
    const totalAttended = (attendance || []).length;
    const percentage = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0;

    return {
      summary: {
        totalSessions,
        totalAttended,
        attendancePercentage: percentage,
        status: percentage >= 80 ? 'Good' : percentage >= 60 ? 'Fair' : 'Low'
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return {
      summary: {
        totalSessions: 0,
        totalAttended: 0,
        attendancePercentage: 0,
        status: 'Unknown'
      },
      error: error.message
    };
  }
};

export const studentFetchCourseAttendance = async (studentId) => {
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        courses!inner (
          id,
          course_code,
          course_title
        )
      `)
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const courseAttendance = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const { data: classes } = await supabase
          .from('classes')
          .select('id')
          .eq('course_id', enrollment.course_id);

        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .in('class_id', (classes || []).map(c => c.id));

        const { count: attendanceCount } = await supabase
          .from('attendance')
          .select('id', { count: 'exact' })
          .eq('student_id', studentId)
          .in('session_id', (sessions || []).map(s => s.id));

        const totalSessions = (sessions || []).length;
        const percentage = totalSessions > 0 ? Math.round((attendanceCount / totalSessions) * 100) : 0;

        return {
          courseCode: enrollment.courses?.course_code,
          courseTitle: enrollment.courses?.course_title,
          courseId: enrollment.course_id,
          totalSessions,
          attended: attendanceCount || 0,
          attendancePercentage: percentage,
          status: percentage >= 80 ? 'Good' : percentage >= 60 ? 'Fair' : 'Low'
        };
      })
    );

    return { courseAttendance, error: null };
  } catch (error) {
    console.error('Error fetching course attendance:', error);
    return { courseAttendance: [], error: error.message };
  }
};

export const studentFetchAlerts = async (studentId) => {
  try {
    const alerts = [];
    const threshold = 75;

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        courses!inner (course_code, course_title)
      `)
      .eq('student_id', studentId);

    for (const enrollment of (enrollments || [])) {
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('course_id', enrollment.course_id);

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('class_id', (classes || []).map(c => c.id));

      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId)
        .in('session_id', (sessions || []).map(s => s.id));

      const percentage = (sessions?.length || 0) > 0 ? (attendanceCount / sessions.length) * 100 : 0;

      if (percentage < threshold) {
        alerts.push({
          type: 'low-attendance',
          severity: percentage < 60 ? 'critical' : 'warning',
          message: `Your attendance in ${enrollment.courses?.course_title} is ${Math.round(percentage)}%. You may face academic penalties.`,
          courseTitle: enrollment.courses?.course_title,
          courseCode: enrollment.courses?.course_code,
          percentage: Math.round(percentage)
        });
      }
    }

    return { alerts, error: null };
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return { alerts: [], error: error.message };
  }
};

// ============================================
// COURSE MANAGEMENT
// ============================================

export const createCourse = async (courseData) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        course_code: courseData.courseCode,
        course_title: courseData.courseTitle,
        program: courseData.program,
        year_level: courseData.yearLevel,
        instructor: courseData.instructor,
        course_status: 'scheduled'
      })
      .select();

    if (error) throw error;

    return { course: data?.[0], error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return { course: null, error: error.message };
  }
};

export const createDelegate = async (delegateData) => {
  try {
    // NOTE: Creating delegates requires admin privileges to create auth users first.
    // This is a limitation when using client-side Supabase without service role.
    // For production, this should be done server-side or with proper auth setup.

    alert('Creating delegates requires admin setup. Please use the setup script or contact administrator to add delegates.');
    return { delegate: null, error: 'Admin privileges required for user creation' };
  } catch (error) {
    console.error('Error creating delegate:', error);
    return { delegate: null, error: error.message };
  }
};

export const adminFetchAllClasses = async () => {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        class_name,
        level,
        delegate_id,
        courses!inner (
          id,
          course_code,
          course_title
        ),
        users!delegate_id (
          id,
          name
        )
      `);

    if (error) throw error;

    return {
      classes: (classes || []).map(cls => ({
        id: cls.id,
        className: cls.class_name,
        level: cls.level,
        courseCode: cls.courses?.course_code,
        courseTitle: cls.courses?.course_title,
        delegateId: cls.delegate_id,
        delegateName: cls.users?.name
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching all classes:', error);
    return { classes: [], error: error.message };
  }
};

export const adminFetchAllStudents = async () => {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, name, matricule')
      .eq('role', 'student');

    if (error) throw error;

    return {
      students: (students || []).map(student => ({
        id: student.id,
        name: student.name,
        matricule: student.matricule
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching all students:', error);
    return { students: [], error: error.message };
  }
};

export const adminFetchAllCourses = async () => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, course_code, course_title, program, year_level');

    if (error) throw error;

    return {
      courses: (courses || []).map(course => ({
        id: course.id,
        courseCode: course.course_code,
        courseTitle: course.course_title,
        program: course.program,
        yearLevel: course.year_level
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching all courses:', error);
    return { courses: [], error: error.message };
  }
};

export const adminFetchAllDelegates = async () => {
  try {
    const { data: delegates, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'delegate');

    if (error) throw error;

    return {
      delegates: (delegates || []).map(delegate => ({
        id: delegate.id,
        name: delegate.name
      })),
      error: null
    };
  } catch (error) {
    console.error('Error fetching all delegates:', error);
    return { delegates: [], error: error.message };
  }
};

export const promoteStudentToDelegate = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'delegate' })
      .eq('id', studentId)
      .select();

    if (error) throw error;

    return { delegate: data?.[0], error: null };
  } catch (error) {
    console.error('Error promoting student to delegate:', error);
    return { delegate: null, error: error.message };
  }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

export const createSession = async (courseId, delegateId, sessionDate, startTime, endTime) => {
  try {
    // First, find or create the class for this course and delegate
    let { data: existingClass, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('course_id', courseId)
      .eq('delegate_id', delegateId)
      .single();

    let classId;
    if (classError && classError.code === 'PGRST116') { // No rows returned
      // Create new class
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('course_title')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      const { data: newClass, error: createClassError } = await supabase
        .from('classes')
        .insert({
          class_name: course.course_title,
          course_id: courseId,
          delegate_id: delegateId
        })
        .select('id')
        .single();

      if (createClassError) throw createClassError;
      classId = newClass.id;
    } else if (classError) {
      throw classError;
    } else {
      classId = existingClass.id;
    }

    // Generate a unique token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Calculate expires_at (1 hour after end time) in UTC
    const [endHour, endMin] = endTime.split(':');
    const endDateTimeCameroon = new Date(sessionDate);
    endDateTimeCameroon.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    const expiresAt = new Date(endDateTimeCameroon.getTime() + (60 * 60 * 1000) - (1 * 60 * 60 * 1000)); // Add 1 hour, then convert Cameroon to UTC

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        class_id: classId,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select();

    if (error) throw error;

    return { session: data?.[0], error: null };
  } catch (error) {
    console.error('Error creating session:', error);
    return { session: null, error: error.message };
  }
};

export const markAttendance = async (studentId, sessionId) => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        student_id: studentId,
        session_id: sessionId
      })
      .select();

    if (error) throw error;

    return { success: true, attendance: data?.[0], error: null };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { success: false, attendance: null, error: error.message };
  }
};

// ============================================
// ATTENDANCE HISTORY & EXPORT QUERIES
// ============================================

export const studentFetchAttendanceHistory = async (studentId) => {
  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id, courses!inner(id, course_code, course_title)')
      .eq('student_id', studentId);

    if (enrollError) throw enrollError;

    const history = [];

    for (const enrollment of (enrollments || [])) {
      const courseId = enrollment.course_id;
      const courseName = enrollment.courses?.course_title || '';
      const courseCode = enrollment.courses?.course_code || '';

      // Get classes for this course
      const { data: classes } = await supabase
        .from('classes')
        .select('id, class_name')
        .eq('course_id', courseId);

      const classIds = (classes || []).map(c => c.id);

      // Get all sessions for these classes
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, session_date, start_time, end_time, class_id, classes!inner(class_name)')
        .in('class_id', classIds)
        .order('session_date', { ascending: false });

      // Get attendance records for this student in these sessions
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id, session_id, created_at')
        .eq('student_id', studentId)
        .in('session_id', (sessions || []).map(s => s.id));

      const attendanceMap = new Set((attendance || []).map(a => a.session_id));

      // Create history records
      for (const session of (sessions || [])) {
        const classInfo = classes?.find(c => c.id === session.class_id);
        history.push({
          courseCode,
          courseName,
          className: classInfo?.class_name || 'Unknown',
          sessionDate: new Date(session.session_date).toLocaleDateString(),
          startTime: session.start_time,
          endTime: session.end_time,
          status: attendanceMap.has(session.id) ? 'Present' : 'Absent',
          sessionId: session.id
        });
      }
    }

    // Calculate per-course statistics
    const courseStats = {};
    for (const record of history) {
      if (!courseStats[record.courseCode]) {
        courseStats[record.courseCode] = {
          courseCode: record.courseCode,
          courseName: record.courseName,
          totalSessions: 0,
          attended: 0,
          percentage: 0
        };
      }
      courseStats[record.courseCode].totalSessions++;
      if (record.status === 'Present') {
        courseStats[record.courseCode].attended++;
      }
    }

    // Calculate percentages
    for (const key in courseStats) {
      const stat = courseStats[key];
      stat.percentage = stat.totalSessions > 0
        ? Math.round((stat.attended / stat.totalSessions) * 100)
        : 0;
    }

    return {
      history: history.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate)),
      courseStats: Object.values(courseStats),
      error: null
    };
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return { history: [], courseStats: [], error: error.message };
  }
};

export const adminFetchAttendanceExportData = async (filters = {}) => {
  try {
    // Fetch all students
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, name, matricule')
      .eq('role', 'student');

    if (studentError) throw studentError;

    const exportData = [];

    for (const student of (students || [])) {
      // Get student's enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, course_code, course_title)')
        .eq('student_id', student.id);

      for (const enrollment of (enrollments || [])) {
        // Apply course filter if provided
        if (filters.courseCode && enrollment.courses?.course_code !== filters.courseCode) {
          continue;
        }

        const courseId = enrollment.course_id;

        // Get classes for this course
        const { data: classes } = await supabase
          .from('classes')
          .select('id, class_name')
          .eq('course_id', courseId);

        const classIds = (classes || []).map(c => c.id);

        // Get sessions
        let sessionsQuery = supabase
          .from('sessions')
          .select('id, session_date, start_time, end_time, class_id, classes!inner(class_name)')
          .in('class_id', classIds);

        // Apply date range filter if provided
        if (filters.startDate) {
          sessionsQuery = sessionsQuery.gte('session_date', filters.startDate);
        }
        if (filters.endDate) {
          sessionsQuery = sessionsQuery.lte('session_date', filters.endDate);
        }

        const { data: sessions } = await sessionsQuery.order('session_date', { ascending: false });

        // Get attendance records
        const { data: attendance } = await supabase
          .from('attendance')
          .select('id, session_id, created_at')
          .eq('student_id', student.id)
          .in('session_id', (sessions || []).map(s => s.id));

        const attendanceMap = new Map(
          (attendance || []).map(a => [a.session_id, true])
        );

        // Create export records
        for (const session of (sessions || [])) {
          const classInfo = classes?.find(c => c.id === session.class_id);
          exportData.push({
            studentName: student.name,
            studentId: student.matricule,
            course: enrollment.courses?.course_code,
            courseName: enrollment.courses?.course_title,
            class: classInfo?.class_name || 'Unknown',
            sessionDate: new Date(session.session_date).toLocaleDateString(),
            sessionTime: `${session.start_time} - ${session.end_time}`,
            status: attendanceMap.has(session.id) ? 'Present' : 'Absent'
          });
        }
      }
    }

    return { data: exportData, error: null };
  } catch (error) {
    console.error('Error fetching export data:', error);
    return { data: [], error: error.message };
  }
};
