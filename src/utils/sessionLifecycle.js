import { supabase } from '../supabase/supabase';

/**
 * Session Lifecycle Management Utilities
 * 
 * Session States:
 * - SCHEDULED: Session created but start time not reached
 * - OPEN: Session is active, attendance can be marked
 * - CLOSED: Session ended, attendance locked
 * 
 * Attendance States:
 * - PRESENT: Student marked attendance on time
 * - LATE: Student marked attendance after late window (first 10 minutes)
 * - ABSENT: Student did not mark attendance before session closed
 */

// Session status constants
export const SESSION_STATUS = {
    SCHEDULED: 'scheduled',
    OPEN: 'open',
    CLOSED: 'closed'
};

// Attendance status constants
export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    LATE: 'late',
    ABSENT: 'absent'
};

// Late window in minutes (first 10 minutes after session start)
export const LATE_WINDOW_MINUTES = 10;

/**
 * Calculate the current status of a session based on server time
 * @param {Object} session - Session object with session_date, start_time, end_time
 * @returns {string} - Session status (scheduled, open, closed)
 */
// Helper function to convert Cameroon time to UTC
const cameroonToUTC = (date, hour, min) => {
    const cameroonTime = new Date(date);
    cameroonTime.setHours(hour, min, 0, 0);
    // Cameroon is UTC+1, so subtract 1 hour to get UTC
    return new Date(cameroonTime.getTime() - (1 * 60 * 60 * 1000));
};

// Helper function to convert UTC to Cameroon time
const utcToCameroon = (utcDate) => {
    // Add 1 hour to UTC to get Cameroon time
    return new Date(utcDate.getTime() + (1 * 60 * 60 * 1000));
};

export const calculateSessionStatus = (session) => {
    const now = new Date();

    // Handle different property names (database vs transformed)
    const sessionDate = session.session_date || session.date;
    const startTime = session.start_time || session.startTime;
    const endTime = session.end_time || session.endTime;

    // Parse start and end times as Cameroon time, then convert to UTC for comparison
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startDateTimeUTC = cameroonToUTC(sessionDate, startHour, startMin);
    const endDateTimeUTC = cameroonToUTC(sessionDate, endHour, endMin);

    // Convert current time to UTC for comparison
    const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

    // Determine status
    if (nowUTC < startDateTimeUTC) {
        return SESSION_STATUS.SCHEDULED;
    } else if (nowUTC >= startDateTimeUTC && nowUTC <= endDateTimeUTC) {
        return SESSION_STATUS.OPEN;
    } else {
        return SESSION_STATUS.CLOSED;
    }
};

/**
 * Check if a student can mark attendance for a session
 * @param {Object} session - Session object
 * @param {string} studentId - Student's user ID
 * @returns {Object} - { canMark: boolean, reason: string, status: string }
 */
export const canMarkAttendance = async (session, studentId) => {
    const status = calculateSessionStatus(session);

    // Check if session is open
    if (status === SESSION_STATUS.SCHEDULED) {
        return {
            canMark: false,
            reason: 'Session has not started yet',
            status
        };
    }

    if (status === SESSION_STATUS.CLOSED) {
        return {
            canMark: false,
            reason: 'Session has ended. Attendance is locked.',
            status
        };
    }

    // Check if student is enrolled in the course
    const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('course_id')
        .eq('id', session.class_id)
        .single();

    if (classError || !classData) {
        return {
            canMark: false,
            reason: 'Unable to verify enrollment',
            status
        };
    }

    const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', classData.course_id)
        .single();

    if (enrollError || !enrollment) {
        return {
            canMark: false,
            reason: 'You are not enrolled in this course',
            status
        };
    }

    // Check if student has already marked attendance
    const { data: existingAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', studentId)
        .single();

    if (existingAttendance) {
        return {
            canMark: false,
            reason: 'You have already marked attendance for this session',
            status
        };
    }

    return {
        canMark: true,
        reason: 'Ready to mark attendance',
        status
    };
};

/**
 * Determine if attendance should be marked as late
 * @param {Object} session - Session object
 * @returns {boolean} - True if current time is past the late window
 */
export const isLateAttendance = (session) => {
    const now = new Date();
    const sessionDate = session.session_date;

    const [startHour, startMin] = session.start_time.split(':').map(Number);

    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const lateThreshold = new Date(startDateTime);
    lateThreshold.setMinutes(lateThreshold.getMinutes() + LATE_WINDOW_MINUTES);

    return now > lateThreshold;
};

/**
 * Mark attendance for a student with proper status
 * @param {string} studentId - Student's user ID
 * @param {string} sessionId - Session ID
 * @returns {Object} - { success: boolean, attendance: Object, error: string }
 */
export const markAttendanceWithStatus = async (studentId, sessionId) => {
    try {
        // First get the session details
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return { success: false, attendance: null, error: 'Session not found' };
        }

        // Check if student can mark attendance
        const { canMark, reason, status } = await canMarkAttendance(session, studentId);

        if (!canMark) {
            return { success: false, attendance: null, error: reason };
        }

        // Determine attendance status (present or late)
        const attendanceStatus = isLateAttendance(session)
            ? ATTENDANCE_STATUS.LATE
            : ATTENDANCE_STATUS.PRESENT;

        // Insert attendance record
        const { data, error } = await supabase
            .from('attendance')
            .insert({
                student_id: studentId,
                session_id: sessionId,
                status: attendanceStatus,
                marked_at: new Date().toISOString()
            })
            .select();

        if (error) {
            // Check for duplicate entry
            if (error.code === '23505') {
                return { success: false, attendance: null, error: 'Attendance already marked' };
            }
            throw error;
        }

        return {
            success: true,
            attendance: data?.[0],
            error: null,
            status: attendanceStatus,
            message: attendanceStatus === ATTENDANCE_STATUS.LATE
                ? 'Attendance marked as LATE'
                : 'Attendance marked successfully!'
        };
    } catch (error) {
        console.error('Error marking attendance:', error);
        return { success: false, attendance: null, error: error.message };
    }
};

/**
 * Auto-mark absent students when session closes
 * @param {string} sessionId - Session ID
 * @returns {Object} - { success: boolean, absentCount: number, error: string }
 */
export const autoMarkAbsentStudents = async (sessionId) => {
    try {
        // Get session details
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*, classes!inner(course_id)')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return { success: false, absentCount: 0, error: 'Session not found' };
        }

        // Check if session is closed
        const status = calculateSessionStatus(session);
        if (status !== SESSION_STATUS.CLOSED) {
            return { success: false, absentCount: 0, error: 'Session is not closed yet' };
        }

        // Get all enrolled students for this course
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('course_id', session.classes.course_id);

        if (enrollError) {
            throw enrollError;
        }

        // Get students who already marked attendance
        const { data: presentStudents, error: presentError } = await supabase
            .from('attendance')
            .select('student_id')
            .eq('session_id', sessionId);

        if (presentError) {
            throw presentError;
        }

        const presentStudentIds = new Set((presentStudents || []).map(a => a.student_id));

        // Find students who didn't mark attendance
        const absentStudents = (enrollments || [])
            .filter(e => !presentStudentIds.has(e.student_id))
            .map(e => ({
                student_id: e.student_id,
                session_id: sessionId,
                status: ATTENDANCE_STATUS.ABSENT,
                marked_at: new Date().toISOString()
            }));

        if (absentStudents.length === 0) {
            return { success: true, absentCount: 0, error: null };
        }

        // Insert absent records
        const { error: insertError } = await supabase
            .from('attendance')
            .insert(absentStudents);

        if (insertError) {
            throw insertError;
        }

        return { success: true, absentCount: absentStudents.length, error: null };
    } catch (error) {
        console.error('Error auto-marking absent students:', error);
        return { success: false, absentCount: 0, error: error.message };
    }
};

/**
 * Check for overlapping sessions for a class
 * @param {string} classId - Class ID
 * @param {string} date - Session date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {string} excludeSessionId - Optional session ID to exclude (for updates)
 * @returns {Object} - { hasOverlap: boolean, overlappingSessions: Array }
 */
export const checkOverlappingSessions = async (classId, date, startTime, endTime, excludeSessionId = null) => {
    try {
        let query = supabase
            .from('sessions')
            .select('id, start_time, end_time')
            .eq('class_id', classId)
            .eq('session_date', date);

        if (excludeSessionId) {
            query = query.neq('id', excludeSessionId);
        }

        const { data: sessions, error } = await query;

        if (error) {
            throw error;
        }

        // Check for time overlaps
        const overlapping = (sessions || []).filter(session => {
            const existingStart = session.start_time;
            const existingEnd = session.end_time;

            // Check if times overlap
            return (startTime < existingEnd && endTime > existingStart);
        });

        return {
            hasOverlap: overlapping.length > 0,
            overlappingSessions: overlapping
        };
    } catch (error) {
        console.error('Error checking overlapping sessions:', error);
        return { hasOverlap: false, overlappingSessions: [], error: error.message };
    }
};

/**
 * Create a session with overlap protection
 * @param {string} delegateId - Delegate's user ID
 * @param {string} classId - Class ID
 * @param {string} sessionDate - Session date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Object} - { session: Object, error: string }
 */
export const createSessionWithValidation = async (delegateId, classId, sessionDate, startTime, endTime) => {
    try {
        // Validate times
        if (startTime >= endTime) {
            return {
                session: null,
                error: 'End time must be after start time'
            };
        }

        // Validate start time is not in the past
        const now = new Date();
        const sessionDateTime = new Date(sessionDate);
        const [startHour, startMin] = startTime.split(':').map(Number);
        sessionDateTime.setHours(startHour, startMin, 0, 0);

        const sessionDateTimeUTC = new Date(sessionDateTime.getTime() - (1 * 60 * 60 * 1000));
        const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

        if (sessionDateTimeUTC <= nowUTC) {
            return {
                session: null,
                error: 'Session start time cannot be in the past'
            };
        }

        // Check for overlapping sessions
        const { hasOverlap, overlappingSessions } = await checkOverlappingSessions(
            classId, sessionDate, startTime, endTime
        );

        if (hasOverlap) {
            return {
                session: null,
                error: `Session overlaps with existing session(s) at ${overlappingSessions.map(s => s.start_time).join(', ')}`
            };
        }

        // Generate a unique token
        const token = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

        // Calculate expires_at (same as end time for automatic closure) in UTC
        const [endHour, endMin] = endTime.split(':');
        const expiresAt = cameroonToUTC(sessionDate, parseInt(endHour), parseInt(endMin));

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

/**
 * Get sessions with calculated status for a student
 * @param {string} studentId - Student's user ID
 * @returns {Object} - { scheduled: Array, open: Array, closed: Array }
 */
export const getStudentSessionsByStatus = async (studentId) => {
    try {
        // Get student's enrolled courses
        const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', studentId);

        if (enrollError) throw enrollError;

        const courseIds = (enrollments || []).map(e => e.course_id);

        // Get classes for these courses
        const { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id')
            .in('course_id', courseIds);

        if (classError) throw classError;

        const classIds = (classes || []).map(c => c.id);

        // Get all sessions for these classes
        const { data: sessions, error: sessionError } = await supabase
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
          courses!inner (course_code, course_title)
        )
      `)
            .in('class_id', classIds)
            .order('session_date', { ascending: false });

        if (sessionError) throw sessionError;

        // Get student's attendance records
        const { data: attendance, error: attendanceError } = await supabase
            .from('attendance')
            .select('session_id, status')
            .eq('student_id', studentId);

        if (attendanceError) throw attendanceError;

        const attendanceMap = new Map(
            (attendance || []).map(a => [a.session_id, a.status])
        );

        // Categorize sessions by status
        const scheduled = [];
        const open = [];
        const closed = [];

        for (const session of (sessions || [])) {
            const status = calculateSessionStatus(session);
            const isMarked = attendanceMap.has(session.id);
            const attendanceStatus = attendanceMap.get(session.id);

            const enrichedSession = {
                id: session.id,
                courseCode: session.classes?.courses?.course_code,
                courseTitle: session.classes?.courses?.course_title,
                className: session.classes?.class_name,
                date: new Date(session.session_date).toLocaleDateString(),
                startTime: session.start_time,
                endTime: session.end_time,
                status,
                isMarked,
                attendanceStatus,
                token: session.token
            };

            switch (status) {
                case SESSION_STATUS.SCHEDULED:
                    scheduled.push(enrichedSession);
                    break;
                case SESSION_STATUS.OPEN:
                    open.push(enrichedSession);
                    break;
                case SESSION_STATUS.CLOSED:
                    closed.push(enrichedSession);
                    break;
            }
        }

        return { scheduled, open, closed, error: null };
    } catch (error) {
        console.error('Error fetching student sessions:', error);
        return { scheduled: [], open: [], closed: [], error: error.message };
    }
};

/**
 * Get sessions with calculated status for a delegate
 * @param {string} delegateId - Delegate's user ID
 * @returns {Object} - { scheduled: Array, open: Array, closed: Array }
 */
export const getDelegateSessionsByStatus = async (delegateId) => {
    try {
        // Get delegate's classes
        const { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('delegate_id', delegateId);

        if (classError) throw classError;

        const classIds = (classes || []).map(c => c.id);

        // Get all sessions for these classes
        const { data: sessions, error: sessionError } = await supabase
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
          courses!inner (course_code, course_title)
        )
      `)
            .in('class_id', classIds)
            .order('session_date', { ascending: false });

        if (sessionError) throw sessionError;

        // Get attendance counts for each session
        const sessionIds = (sessions || []).map(s => s.id);
        const { data: attendanceCounts, error: countError } = await supabase
            .from('attendance')
            .select('session_id')
            .in('session_id', sessionIds);

        // Count attendance per session
        const countMap = new Map();
        (attendanceCounts || []).forEach(a => {
            countMap.set(a.session_id, (countMap.get(a.session_id) || 0) + 1);
        });

        // Categorize sessions by status
        const scheduled = [];
        const open = [];
        const closed = [];

        for (const session of (sessions || [])) {
            const status = calculateSessionStatus(session);

            const enrichedSession = {
                id: session.id,
                courseCode: session.classes?.courses?.course_code,
                courseTitle: session.classes?.courses?.course_title,
                className: session.classes?.class_name,
                date: new Date(session.session_date).toLocaleDateString(),
                startTime: session.start_time,
                endTime: session.end_time,
                status,
                attendanceCount: countMap.get(session.id) || 0,
                token: session.token
            };

            switch (status) {
                case SESSION_STATUS.SCHEDULED:
                    scheduled.push(enrichedSession);
                    break;
                case SESSION_STATUS.OPEN:
                    open.push(enrichedSession);
                    break;
                case SESSION_STATUS.CLOSED:
                    closed.push(enrichedSession);
                    break;
            }
        }

        return { scheduled, open, closed, error: null };
    } catch (error) {
        console.error('Error fetching delegate sessions:', error);
        return { scheduled: [], open: [], closed: [], error: error.message };
    }
};

/**
 * Process session closure - auto-mark absent students
 * This should be called when a session transitions to CLOSED status
 * @param {string} sessionId - Session ID
 */
export const processSessionClosure = async (sessionId) => {
    try {
        // Auto-mark absent students
        const result = await autoMarkAbsentStudents(sessionId);

        if (!result.success) {
            console.error('Failed to auto-mark absent students:', result.error);
        } else {
            console.log(`Session ${sessionId} closed. ${result.absentCount} students marked absent.`);
        }

        return result;
    } catch (error) {
        console.error('Error processing session closure:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get time remaining until session starts or ends
 * @param {Object} session - Session object
 * @returns {Object} - { type: 'start'|'end', minutes: number, formatted: string }
 */
export const getTimeRemaining = (session) => {
    const now = new Date();

    // Handle different property names
    const sessionDate = session.session_date || session.date;
    const startTime = session.start_time || session.startTime;
    const endTime = session.end_time || session.endTime;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startDateTimeUTC = cameroonToUTC(sessionDate, startHour, startMin);
    const endDateTimeUTC = cameroonToUTC(sessionDate, endHour, endMin);
    const nowUTC = new Date(now.getTime() - (now.getTimezoneOffset() * 60 * 1000));

    if (nowUTC < startDateTimeUTC) {
        const diffMs = startDateTimeUTC - nowUTC;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return {
            type: 'start',
            minutes,
            formatted: hours > 0 ? `${hours}h ${mins}m until start` : `${mins}m until start`
        };
    } else if (nowUTC < endDateTimeUTC) {
        const diffMs = endDateTimeUTC - nowUTC;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return {
            type: 'end',
            minutes,
            formatted: hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`
        };
    }

    return {
        type: 'ended',
        minutes: 0,
        formatted: 'Session ended'
    };
};
