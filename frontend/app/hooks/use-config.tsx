"use client";

import { useState, useEffect } from 'react';

// Define config type
type Config = {
  pocketbaseUrl: string;
  n8nWebhookUrl: string;
};

// Add this function for server-side usage
export async function fetchConfig(): Promise<Config> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

// Client-side hook
export function useConfig() {
  const [config, setConfig] = useState<Config>({
    pocketbaseUrl: '',
    n8nWebhookUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await fetchConfig();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  return { config, loading, error };
} 