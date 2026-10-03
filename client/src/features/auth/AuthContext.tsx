import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchCurrentUser,
  registerRequest,
  signInRequest,
  signOutRequest,
  updateProfileRequest,
  type User,
} from './auth.api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<{ email: string; verificationRequired: boolean; user?: User }>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<User>;
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
      const result = await registerRequest(name, email, password);
      if (result.user) setUser(result.user);
      return result;
    },
    async signOut() {
      await signOutRequest();
      setUser(null);
    },
    async updateName(name) {
      const updatedUser = await updateProfileRequest(name);
      setUser(updatedUser);
      return updatedUser;
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
