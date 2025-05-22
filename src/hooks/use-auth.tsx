
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const profileFetchedForUserIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  // Fetch user profile data
  const fetchProfileCallback = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('slack_webhook_url')
        .eq('id', userId)
        .single();
  
      if (error) {
        console.error("Error fetching profile:", error.message);
        setProfile(null); // Clear profile on error
        // If the fetch failed for the user ID currently in the ref, clear the ref
        // to allow retries for this user.
        if (profileFetchedForUserIdRef.current === userId) {
          profileFetchedForUserIdRef.current = null;
        }
        return;
      }
  
      setProfile(data || { slack_webhook_url: null });
      profileFetchedForUserIdRef.current = userId; // Mark profile as successfully fetched for this user
    } catch (err) {
      console.error("Failed to fetch profile (catch):", err);
      setProfile(null); // Clear profile on error
      if (profileFetchedForUserIdRef.current === userId) {
        profileFetchedForUserIdRef.current = null;
      }
    }
  }, []); // supabase client is stable, setProfile is stable.

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
            // Show "Successfully logged in!" only if it's a new sign-in (no previous user),
            // email is confirmed, AND email wasn't *just* verified in this event.
            if (!prevUser && incomingUser?.email_confirmed_at && !emailJustVerified) {
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
          profileFetchedForUserIdRef.current = null;
          setIsLoading(false);
          navigate('/auth');
        } else if (incomingUser) { // Covers SIGNED_IN, USER_UPDATED, TOKEN_REFRESHED with a user
          setIsLoading(false);
          const newUserId = incomingUser.id;
          
          let doFetchProfile = false;
          if (newUserId !== profileFetchedForUserIdRef.current) {
            // User ID has changed, or profile was never successfully fetched for this ID (ref is different or null)
            doFetchProfile = true;
          } else if (profile === null) {
            // User ID is the same as last successful fetch, but current profile state is null
            // (e.g., fetchProfileCallback had an error after setting the ref, or ref was set but setProfile is pending/failed).
            // So, we should try to fetch again.
            doFetchProfile = true;
          }

          // Overrides for events where we want to be conservative about refetching:
          // If profile is already loaded for this user (ref matches and profile state is not null),
          // then TOKEN_REFRESHED or USER_UPDATED should not trigger a new fetch.
          if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
              newUserId === profileFetchedForUserIdRef.current &&
              profile !== null) {
            doFetchProfile = false;
          }

          if (doFetchProfile) {
            fetchProfileCallback(newUserId);
          }
          
          if (window.location.pathname === '/auth' && incomingUser?.email_confirmed_at) {
            navigate('/');
          }
        } else if (event !== 'SIGNED_OUT') { // No incomingUser and not a SIGNED_OUT event
          setIsLoading(false); // Ensure loading is false for other events without a user
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const initialUser = currentSession?.user ?? null;
      setUser(initialUser);
      
      if (initialUser) {
        // Fetch profile if not already fetched for this user OR if profile state is null
        if (initialUser.id !== profileFetchedForUserIdRef.current || profile === null) {
          await fetchProfileCallback(initialUser.id);
        }
      } else {
        setProfile(null); // No initial user, ensure profile is null
        profileFetchedForUserIdRef.current = null; // and ref is cleared
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
  // `user` and `profile` state are intentionally omitted from dependencies to prevent re-subscribing onAuthStateChange.
  // Logic within the effect uses `incomingUser` from the event, functional `setUser`, and `profileFetchedForUserIdRef`.
  }, [navigate, fetchProfileCallback]);

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
