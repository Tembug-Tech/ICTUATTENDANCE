import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { session_id, token } = await req.json();

    // Get user from auth
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'NOT_AUTHENTICATED', 
          message: 'Not authenticated' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Check session exists and is valid
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'SESSION_NOT_FOUND', 
          message: 'Session not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify token matches
    if (session.token !== token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'INVALID_TOKEN', 
          message: 'Invalid session token' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if session is still active (time-based)
    const now = new Date();
    if (new Date(session.expires_at) < now) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'SESSION_EXPIRED', 
          message: 'Session has expired. Attendance marking is no longer available.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if student already marked attendance in this session
    const { data: existingAttendance, error: checkError } = await supabaseClient
      .from('attendance')
      .select('id')
      .eq('session_id', session_id)
      .eq('student_id', user.id)
      .single();

    if (existingAttendance) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_code: 'ALREADY_MARKED', 
          message: 'You have already marked attendance for this session' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Record attendance
    const { data: attendanceRecord, error: insertError } = await supabaseClient
      .from('attendance')
      .insert({
        session_id: session_id,
        student_id: user.id,
        created_at: now.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Attendance marked successfully',
        data: {
          attendance_id: attendanceRecord.id,
          timestamp: attendanceRecord.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in verifyAttendance function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error_code: 'INTERNAL_ERROR',
        message: 'An error occurred while processing your request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
