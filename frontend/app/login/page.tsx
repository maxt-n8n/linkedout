'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Footer } from '@/components/footer';
import { useConfig } from '@/hooks/use-config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { config, loading: configLoading } = useConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, perform the normal login
      await login(email, password);
      
      // Then check if setup is complete by looking for the service user
      const isSetupComplete = await checkSetupComplete();
      
      // Redirect based on setup status
      if (isSetupComplete) {
        router.push('/inbox');
      } else {
        router.push('/setup');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to check if the service user exists using direct API call
  const checkSetupComplete = async (): Promise<boolean> => {
    try {
      if (!config.pocketbaseUrl) {
        console.error('PocketBase URL is not configured');
        return true; // Default to inbox if we can't check
      }
      
      const serviceUserEmail = 'linkedout-service-user@n8n.io';
      
      // Get the token from localStorage after login
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found');
        return true; // Default to inbox if we can't check
      }
      
      // Use config.pocketbaseUrl
      const response = await fetch(`${config.pocketbaseUrl}/api/collections/users/records?filter=(email='${serviceUserEmail}')&fields=id,email`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to check for service user');
        return true; // Default to inbox if we can't check
      }
      
      const data = await response.json();
      return data.totalItems > 0;
    } catch (error) {
      console.error('Error checking setup status:', error);
      // If we can't check, assume setup is complete
      return true;
    }
  };

  return (
    <div className="container max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image 
              src="/images/linkedout-logo.svg" 
              alt="LinkedOut Logo" 
              width={200} 
              height={60} 
              priority
            />
          </div>
          <p className="text-muted-foreground">Enter your credentials to access your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
      <Footer className="absolute bottom-2" />
    </div>
  );
} 