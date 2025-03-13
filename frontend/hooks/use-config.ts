'use client';

import { useState, useEffect } from 'react';

export function useConfig() {
  const [config, setConfig] = useState({
    // Start with build-time values
    pocketbaseUrl: process.env.NEXT_PUBLIC_POCKETBASE_URL || '',
    n8nWebhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch runtime config if build-time values are missing
    if (!config.pocketbaseUrl || !config.n8nWebhookUrl) {
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          setConfig({
            pocketbaseUrl: data.pocketbaseUrl || config.pocketbaseUrl,
            n8nWebhookUrl: data.n8nWebhookUrl || config.n8nWebhookUrl,
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load runtime config:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  return { config, loading };
}