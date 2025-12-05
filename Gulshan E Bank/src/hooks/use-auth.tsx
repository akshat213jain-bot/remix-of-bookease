
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';


type UserRole = "customer" | "staff" | "manager" | "admin";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  refreshUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const refreshUser = useCallback(() => {
    if (auth.currentUser) {
      // Create a new User object instance to trigger re-renders
      setUser({ ...auth.currentUser });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // In a real app, you would fetch the user's role from a database.
        // For now, we'll default to 'customer'. We can add logic to simulate other roles.
        if (user.email?.includes('staff')) {
            setRole('staff');
        } else {
            setRole('customer');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        )
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
};
