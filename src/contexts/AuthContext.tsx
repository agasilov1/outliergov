import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'firm_user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  mustChangePassword: boolean;
  clearMustChangePassword: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const isMounted = useRef(true);

  async function fetchUserRoles(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      if (!isMounted.current) return;
      const userRoles = data?.map(r => r.role as AppRole) || [];
      setRoles(userRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  }

  async function fetchMustChangePassword(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching must_change_password:', error);
        return;
      }

      if (!isMounted.current) return;
      setMustChangePassword(data?.must_change_password === true);
    } catch (err) {
      console.error('Error fetching must_change_password:', err);
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role and profile fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
            fetchMustChangePassword(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setMustChangePassword(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
        await fetchMustChangePassword(session.user.id);
      }
      
      if (isMounted.current) setLoading(false);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  function clearMustChangePassword() {
    setMustChangePassword(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setMustChangePassword(false);
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    roles,
    isAdmin: roles.includes('admin'),
    mustChangePassword,
    clearMustChangePassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
