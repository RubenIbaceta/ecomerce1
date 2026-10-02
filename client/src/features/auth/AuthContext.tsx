import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchCurrentUser,
  registerRequest,
  signInRequest,
  signOutRequest,
  type User,
} from './auth.api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((currentUser) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(email, password) {
      const signedInUser = await signInRequest(email, password);
      setUser(signedInUser);
      return signedInUser;
    },
    async register(name, email, password) {
      const registeredUser = await registerRequest(name, email, password);
      setUser(registeredUser);
      return registeredUser;
    },
    async signOut() {
      await signOutRequest();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
