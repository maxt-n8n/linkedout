"use client";

import { createContext, useState, useContext } from 'react';
import Cookies from 'js-cookie';
import { useConfig } from '@/hooks/use-config';

// Define the user type
type User = {
  id: string;
  email: string;
  verified: boolean;
};

// Define the context type
type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  isLoading: boolean;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
  user: User | null;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  isLoading: false,
  logout: () => {},
  login: async () => {},
  user: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Add state hooks
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { config, loading: configLoading } = useConfig();
  
  // Add logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    Cookies.remove('auth_token');
  };
  
  // Update the login function to use the config
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Use config.pocketbaseUrl instead of environment variable directly
      if (!config.pocketbaseUrl) {
        throw new Error('PocketBase URL is not configured');
      }
      
      const response = await fetch(`${config.pocketbaseUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identity: email, 
          password 
        }),
      });
      
      // Rest of the function remains the same
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      setToken(data.token);
      setUser({
        id: data.record.id,
        email: data.record.email,
        verified: data.record.verified
      });
      
      localStorage.setItem('token', data.token);
      
      Cookies.set('auth_token', data.token, { 
        expires: 7,
        path: '/',
        domain: window.location.hostname,
        sameSite: 'lax',
        secure: false
      });
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the provider to include configLoading in isLoading
  return (
    <AuthContext.Provider value={{ 
      token, 
      setToken, 
      isLoading: isLoading || configLoading, 
      logout, 
      login, 
      user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};