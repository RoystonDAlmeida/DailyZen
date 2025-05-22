
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Helper function to clean up Supabase auth state
const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

type ProfileData = {
  slack_webhook_url: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; }>;
  signOut: () => Promise<void>;
  profile: ProfileData | null;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const navigate = useNavigate();

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('slack_webhook_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data || { slack_webhook_url: null });
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        const previousUser = user; // Capture user state before it's updated by this event
        const currentUser = currentSession?.user ?? null;

        // Check if email was just verified
        if (currentUser && currentUser.email_confirmed_at && (!previousUser || !previousUser.email_confirmed_at)) {
          toast.success("Email successfully verified!");
        }

        // Update session and user state
        setSession(currentSession);
        setUser(currentUser);
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          // If signed out, redirect to auth page
          setIsLoading(false);
          navigate('/auth');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsLoading(false);

          // If user exists, fetch their profile
          if (currentSession?.user) {
            // Use setTimeout to allow current auth event processing to complete before fetching profile
            setTimeout(() => {
              fetchProfile(currentSession.user.id);
            }, 0);
          }
          
          // If signed in, redirect to home page
          if (event === 'SIGNED_IN' && window.location.pathname === '/auth') {
            if (currentUser?.email_confirmed_at) { // Only redirect if email is confirmed
              navigate('/');
            }
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
      
      // If no session and not on auth page, redirect to auth
      if (!currentSession && window.location.pathname !== '/auth') {
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, user]);

  const signUp = async (email: string, password: string) => {
    // Clean up existing auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      if (error.message.includes("User already registered")) {
        // This error typically means the email is registered (often for a verified user).
        toast.error("This email is already registered. Please try signing in.");
      } else {
        toast.error(`Signup failed: ${error.message}`);
      }
      throw error;
    }
    
    toast.success("Signup successful! Check your email for verification.");
  };

  const signIn = async (email: string, password: string): Promise<{ user: User | null; session: Session | null; }> => {
    // Clean up existing auth state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Error will be caught and handled by the calling component ( Auth.tsx)
      throw error;
    }
    return data; // Return { user, session } to the caller
  };

  const signOut = async () => {
    try {
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out
      await supabase.auth.signOut({ scope: 'global' });
      
      // Reset state
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast.success("Successfully logged out");
      
      // Navigate to auth page
      navigate('/auth');
    } catch (err) {
      console.error("Error signing out from Supabase:", err);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile. Please try again.");
      throw err;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    profile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
