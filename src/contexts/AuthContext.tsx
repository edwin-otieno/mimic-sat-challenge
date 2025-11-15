
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'teacher';
  first_name: string | null;
  last_name: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, schoolId?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    const setupAuth = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (!isMounted) return;
            console.log("Auth state changed:", event, !!currentSession);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            
            // Fetch profile data if user is authenticated
            if (currentSession?.user) {
              setTimeout(() => {
                fetchProfile(currentSession.user.id);
              }, 0);
            } else {
              setProfile(null);
            }
          }
        );

        // THEN check for existing session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        console.log("Initial session check:", !!currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
        }
        
        setIsLoading(false);

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error setting up auth:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, first_name, last_name, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Don't throw error, just log it and continue
        return;
      }

      console.log("Profile fetched:", data);
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Don't throw error, just log it and continue
      // This prevents the app from crashing on network errors
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Error signing in',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error signing in',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, schoolId?: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            school_id: schoolId,
          },
        },
      });

      if (authError) {
        toast({
          title: 'Error signing up',
          description: authError.message,
          variant: 'destructive',
        });
        return;
      }

      // Update profile with school_id if provided
      if (authData.user && schoolId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ school_id: schoolId })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Error updating profile with school:', profileError);
        }
      }

      toast({
        title: 'Success!',
        description: 'Please check your email to confirm your account',
      });
    } catch (error: any) {
      toast({
        title: 'Error signing up',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isTeacher = profile?.role === 'teacher';
  console.log("Admin status:", isAdmin, "Teacher status:", isTeacher, "Profile:", profile);

  const value = {
    session,
    user,
    profile,
    isLoading,
    isAdmin,
    isTeacher,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
