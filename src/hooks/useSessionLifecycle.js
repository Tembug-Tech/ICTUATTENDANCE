import { useState, useEffect, useCallback, useRef } from 'react';
import {
    SESSION_STATUS,
    calculateSessionStatus,
    getStudentSessionsByStatus,
    getDelegateSessionsByStatus,
    markAttendanceWithStatus,
    processSessionClosure,
    getTimeRemaining
} from '../utils/sessionLifecycle';

/**
 * Custom hook for managing session lifecycle with real-time updates
 * Automatically updates session statuses based on time
 * 
 * @param {string} userId - User's ID
 * @param {string} role - User's role ('student' or 'delegate')
 * @param {number} refreshInterval - Interval in ms for checking status updates (default: 10000)
 */
export const useSessionLifecycle = (userId, role, refreshInterval = 10000) => {
    const [sessions, setSessions] = useState({
        scheduled: [],
        open: [],
        closed: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Track sessions that have transitioned to closed for processing
    const processedClosures = useRef(new Set());

    // Fetch sessions based on role
    const fetchSessions = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            let result;
            if (role === 'student') {
                result = await getStudentSessionsByStatus(userId);
            } else if (role === 'delegate') {
                result = await getDelegateSessionsByStatus(userId);
            } else {
                throw new Error('Invalid role');
            }

            if (result.error) {
                throw new Error(result.error);
            }

            setSessions({
                scheduled: result.scheduled || [],
                open: result.open || [],
                closed: result.closed || []
            });
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, role]);

    // Check for status transitions and update accordingly
    const checkStatusTransitions = useCallback(() => {
        const now = new Date();
        let hasChanges = false;

        // Check scheduled sessions that should now be open
        const newScheduled = [];
        const newOpen = [...sessions.open];

        for (const session of sessions.scheduled) {
            const currentStatus = calculateSessionStatus(session);

            if (currentStatus === SESSION_STATUS.OPEN) {
                newOpen.push({ ...session, status: SESSION_STATUS.OPEN });
                hasChanges = true;
            } else {
                newScheduled.push(session);
            }
        }

        // Check open sessions that should now be closed
        const newClosed = [...sessions.closed];
        const stillOpen = [];

        for (const session of newOpen) {
            const currentStatus = calculateSessionStatus(session);

            if (currentStatus === SESSION_STATUS.CLOSED) {
                newClosed.push({ ...session, status: SESSION_STATUS.CLOSED });
                hasChanges = true;

                // Process session closure (auto-mark absent) if not already processed
                if (!processedClosures.current.has(session.id)) {
                    processedClosures.current.add(session.id);
                    processSessionClosure(session.id).catch(console.error);
                }
            } else {
                stillOpen.push(session);
            }
        }

        if (hasChanges) {
            setSessions({
                scheduled: newScheduled,
                open: stillOpen,
                closed: newClosed
            });
            setLastUpdate(new Date());
        }
    }, [sessions]);

    // Initial fetch
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Set up interval for checking status transitions
    useEffect(() => {
        const interval = setInterval(() => {
            checkStatusTransitions();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [checkStatusTransitions, refreshInterval]);

    // Refresh data periodically (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSessions();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchSessions]);

    // Mark attendance function
    const markAttendance = useCallback(async (sessionId) => {
        if (!userId) {
            return { success: false, error: 'User not authenticated' };
        }

        const result = await markAttendanceWithStatus(userId, sessionId);

        if (result.success) {
            // Update local state to reflect the change
            setSessions(prev => ({
                ...prev,
                open: prev.open.map(s =>
                    s.id === sessionId
                        ? { ...s, isMarked: true, attendanceStatus: result.status }
                        : s
                )
            }));
        }

        return result;
    }, [userId]);

    // Get time remaining for a session
    const getSessionTimeRemaining = useCallback((session) => {
        return getTimeRemaining({
            session_date: session.date,
            start_time: session.startTime,
            end_time: session.endTime
        });
    }, []);

    // Get all active sessions (open sessions)
    const activeSessions = sessions.open;

    // Get upcoming sessions (scheduled)
    const upcomingSessions = sessions.scheduled;

    // Get past sessions (closed)
    const pastSessions = sessions.closed;

    // Get sessions that need attention (open but not marked for students)
    const sessionsNeedingAttention = role === 'student'
        ? sessions.open.filter(s => !s.isMarked)
        : sessions.open;

    return {
        sessions,
        activeSessions,
        upcomingSessions,
        pastSessions,
        sessionsNeedingAttention,
        loading,
        error,
        lastUpdate,
        refresh: fetchSessions,
        markAttendance,
        getSessionTimeRemaining
    };
};

/**
 * Custom hook for countdown timer
 * @param {Object} session - Session object
 * @param {number} updateInterval - Update interval in ms (default: 1000)
 */
export const useSessionCountdown = (session, updateInterval = 1000) => {
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        if (!session) return;

        const updateTime = () => {
            const remaining = getTimeRemaining({
                session_date: session.date || session.session_date,
                start_time: session.startTime || session.start_time,
                end_time: session.endTime || session.end_time
            });
            setTimeRemaining(remaining);
        };

        updateTime();
        const interval = setInterval(updateTime, updateInterval);

        return () => clearInterval(interval);
    }, [session, updateInterval]);

    return timeRemaining;
};

/**
 * Custom hook for real-time session status
 * @param {Object} session - Session object
 */
export const useSessionStatus = (session) => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        if (!session) return;

        const updateStatus = () => {
            const currentStatus = calculateSessionStatus({
                session_date: session.date || session.session_date,
                start_time: session.startTime || session.start_time,
                end_time: session.endTime || session.end_time
            });
            setStatus(currentStatus);
        };

        updateStatus();
        const interval = setInterval(updateStatus, 5000);

        return () => clearInterval(interval);
    }, [session]);

    return status;
};

export default useSessionLifecycle;
