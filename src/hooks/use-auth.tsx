
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
        const incomingUser = currentSession?.user ?? null;

        // Update user state using functional update to access previous state correctly
        setUser(prevUser => {
          let emailJustVerified = false;
          // Check if email was just verified by comparing with prevUser
          if (incomingUser && incomingUser.email_confirmed_at && prevUser && prevUser.id === incomingUser.id && !prevUser.email_confirmed_at) {
            toast.success("Email successfully verified!");
            emailJustVerified = true;
          }

          // Handle SIGNED_IN specific toasts
          if (event === 'SIGNED_IN') {
            if (incomingUser?.email_confirmed_at && !emailJustVerified) {
              // Show "Successfully logged in!" only if email is confirmed AND wasn't just verified in this event.
              toast.success("Successfully logged in!");
            }
          }
          return incomingUser; // New user state
        });

        // Update session state (doesn't depend on previous session state for logic here)
        setSession(currentSession);
        
        // Handle events
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsLoading(false);
          navigate('/auth');
        } else if (event === 'SIGNED_IN') {
          setIsLoading(false);
          if (incomingUser) {
            setTimeout(() => fetchProfile(incomingUser.id), 0);
          }
          if (window.location.pathname === '/auth' && incomingUser?.email_confirmed_at) {
            navigate('/');
          }
        } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          setIsLoading(false);
          if (incomingUser) {
            // For TOKEN_REFRESHED, profile fetch might be optional if user data hasn't changed.
            // However, fetching ensures consistency if the token refresh also updated user details.
            setTimeout(() => fetchProfile(incomingUser.id), 0);
          }
          // The "Email successfully verified!" toast is handled within setUser's functional update
          // if USER_UPDATED was due to email verification.
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const initialUser = currentSession?.user ?? null;
      setUser(initialUser);
      
      if (initialUser) {
        fetchProfile(initialUser.id);
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
  // Removed 'user' from dependencies to prevent useEffect from re-running excessively
  // when 'user' state is updated within the effect itself.
  }, [navigate]);

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
