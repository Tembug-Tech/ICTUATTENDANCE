-- ENABLE ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Admin can view all users
CREATE POLICY "admin_view_all_users" ON users
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view only their own profile
CREATE POLICY "student_view_own_profile" ON users
  FOR SELECT
  USING (auth.uid() = id AND auth.jwt() ->> 'user_metadata'->>'role' = 'student');

-- Delegates can view students in their classes
CREATE POLICY "delegate_view_students_in_classes" ON users
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND role = 'student'
    AND id IN (
      SELECT DISTINCT student_id FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.delegate_id = auth.uid()
    )
  );

-- ============================================
-- COURSES TABLE POLICIES
-- ============================================

-- Admin can view all courses
CREATE POLICY "admin_view_all_courses" ON courses
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view their enrolled courses
CREATE POLICY "student_view_enrolled_courses" ON courses
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND id IN (SELECT course_id FROM enrollments WHERE student_id = auth.uid())
  );

-- Delegates can view courses they teach
CREATE POLICY "delegate_view_taught_courses" ON courses
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND id IN (SELECT DISTINCT course_id FROM classes WHERE delegate_id = auth.uid())
  );

-- ============================================
-- CLASSES TABLE POLICIES
-- ============================================

-- Admin can view all classes
CREATE POLICY "admin_view_all_classes" ON classes
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view their enrolled course classes
CREATE POLICY "student_view_enrolled_classes" ON classes
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND course_id IN (SELECT course_id FROM enrollments WHERE student_id = auth.uid())
  );

-- Delegates can view only their assigned classes
CREATE POLICY "delegate_view_own_classes" ON classes
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND delegate_id = auth.uid()
  );

-- Admin can create classes
CREATE POLICY "admin_create_classes" ON classes
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- ============================================
-- SESSIONS TABLE POLICIES
-- ============================================

-- Admin can view all sessions
CREATE POLICY "admin_view_all_sessions" ON sessions
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view sessions for their enrolled courses
CREATE POLICY "student_view_sessions_for_enrolled" ON sessions
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND class_id IN (
      SELECT id FROM classes WHERE course_id IN (
        SELECT course_id FROM enrollments WHERE student_id = auth.uid()
      )
    )
  );

-- Delegates can view sessions for their classes
CREATE POLICY "delegate_view_own_sessions" ON sessions
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND class_id IN (SELECT id FROM classes WHERE delegate_id = auth.uid())
  );

-- Delegates can create sessions for their classes
CREATE POLICY "delegate_create_sessions" ON sessions
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND class_id IN (SELECT id FROM classes WHERE delegate_id = auth.uid())
  );

-- Delegates can update their own sessions
CREATE POLICY "delegate_update_sessions" ON sessions
  FOR UPDATE
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND class_id IN (SELECT id FROM classes WHERE delegate_id = auth.uid())
  );

-- ============================================
-- ATTENDANCE TABLE POLICIES
-- ============================================

-- Admin can view all attendance records
CREATE POLICY "admin_view_all_attendance" ON attendance
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view their own attendance
CREATE POLICY "student_view_own_attendance" ON attendance
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND student_id = auth.uid()
  );

-- Students can mark themselves present (INSERT only once per session)
CREATE POLICY "student_mark_own_attendance" ON attendance
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND student_id = auth.uid()
    AND session_id IN (
      SELECT id FROM sessions WHERE class_id IN (
        SELECT id FROM classes WHERE course_id IN (
          SELECT course_id FROM enrollments WHERE student_id = auth.uid()
        )
      )
    )
  );

-- Delegates can view attendance for their sessions
CREATE POLICY "delegate_view_session_attendance" ON attendance
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND session_id IN (
      SELECT id FROM sessions WHERE class_id IN (
        SELECT id FROM classes WHERE delegate_id = auth.uid()
      )
    )
  );

-- ============================================
-- ENROLLMENTS TABLE POLICIES
-- ============================================

-- Admin can view all enrollments
CREATE POLICY "admin_view_all_enrollments" ON enrollments
  FOR SELECT
  USING (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Admin can create enrollments
CREATE POLICY "admin_create_enrollments" ON enrollments
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'user_metadata'->>'role' = 'admin');

-- Students can view their own enrollments
CREATE POLICY "student_view_own_enrollments" ON enrollments
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'student'
    AND student_id = auth.uid()
  );

-- Delegates can view enrollments for their courses
CREATE POLICY "delegate_view_course_enrollments" ON enrollments
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_metadata'->>'role' = 'delegate'
    AND course_id IN (
      SELECT DISTINCT course_id FROM classes WHERE delegate_id = auth.uid()
    )
  );
