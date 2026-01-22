import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'student', 'delegate', 'admin'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to fetch and update user data
  const updateUserFromDatabase = async (userId) => {
    try {
      console.log('📱 AuthContext: Fetching role for userId:', userId);

      // Create a promise that rejects after 8 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Role fetch timeout')), 8000)
      );

      const queryPromise = (async () => {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role, name, matricule')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('❌ AuthContext: Query error:', userError);
          throw userError;
        }

        return userData;
      })();

      const userData = await Promise.race([queryPromise, timeoutPromise]);

      if (!userData) {
        console.warn('⚠️ AuthContext: User not found in database for ID:', userId);
        return null;
      }

      console.log('✅ AuthContext: Role retrieved:', userData?.role);
      return userData;
    } catch (err) {
      console.error('❌ AuthContext: Role fetch error:', err.message);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session on mount
    let unsubscribed = false;

    const initAuth = async () => {
      try {
        console.log('📱 AuthContext: Initializing auth on mount...');

        // Try to get session but don't wait - let the listener handle it
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
          if (unsubscribed) return;

          if (sessionError) {
            console.warn('⚠️ AuthContext: Session retrieval error:', sessionError.message);
          }

          if (session?.user) {
            console.log('📱 AuthContext: Existing session found for user:', session.user.email);
            updateUserFromDatabase(session.user.id).then(userData => {
              if (!unsubscribed) {
                setCurrentUser({ ...session.user, ...(userData || {}) });
                setUserRole(userData?.role || null);
              }
            });
          }
        }).catch(err => {
          console.warn('⚠️ AuthContext: Session check failed:', err.message);
        });

        // Set loading to false immediately - don't wait for session check
        if (!unsubscribed) {
          console.log('✅ AuthContext: Loading complete (no wait)');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ AuthContext: Auth initialization error:', err.message);
        setError(err.message);
        if (!unsubscribed) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (unsubscribed) return;

      console.log('📱 AuthContext: Auth state changed - Event type:', event, '| Session exists:', !!session?.user);

      try {
        if (session?.user) {
          console.log('📱 AuthContext: Processing auth state change for user:', session.user.email);
          const userData = await updateUserFromDatabase(session.user.id);

          if (!unsubscribed) {
            setCurrentUser({ ...session.user, ...(userData || {}) });
            setUserRole(userData?.role || null);
            console.log('✅ AuthContext: User state updated - Role:', userData?.role);
          }
        } else {
          console.log('📱 AuthContext: Auth state change - no session, clearing user');
          if (!unsubscribed) {
            setCurrentUser(null);
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error('❌ AuthContext: Error processing auth state change:', err.message);
        setError(err.message);
      }
    });

    return () => {
      unsubscribed = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      console.log('📱 AuthContext.login: Logging in:', email);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('❌ AuthContext.login: Auth error:', error.message);
        throw error;
      }

      console.log('✅ AuthContext.login: Auth successful');

      // Set user immediately - don't wait for role
      setCurrentUser(data.user);

      // Fetch role in background
      if (data.user?.id) {
        updateUserFromDatabase(data.user.id).then(userData => {
          if (userData?.role) {
            setUserRole(userData.role);
            console.log('✅ AuthContext.login: Role set:', userData.role);
          }
        }).catch(err => {
          console.warn('⚠️ Background role fetch error:', err.message);
        });
      }

      return data.user;
    } catch (err) {
      console.error('❌ AuthContext.login: Error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const signup = async (fullName, matricule, email, password) => {
    try {
      console.log('📱 AuthContext.signup: Creating account for:', email);
      setError(null);

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            matricule: matricule
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        console.error('❌ AuthContext.signup: Auth signup error:', authError.message);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ AuthContext.signup: Auth user created, ID:', authData.user.id);

      // 2. Create user record in database
      const { data: dbData, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: fullName,
          matricule: matricule,
          email: email,
          role: 'student'
        });

      if (dbError) {
        console.error('❌ AuthContext.signup: Database error:', dbError.message);
        // If database insert fails, we should clean up the auth user
        // But for now, just throw the error
        throw dbError;
      }

      console.log('✅ AuthContext.signup: Database record created');

      return authData.user;
    } catch (err) {
      console.error('❌ AuthContext.signup: Error:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    signup,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};