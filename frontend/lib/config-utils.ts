import { fetchConfig } from '../app/hooks/use-config';

export async function getConfigValue(key: 'pocketbaseUrl' | 'n8nWebhookUrl'): Promise<string> {
  // First try environment variables
  const envValue = process.env[key.toUpperCase()];
  if (envValue) {
    return envValue;
  }
  
  // Fall back to API
  try {
    const config = await fetchConfig();
    return config[key] || '';
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return '';
  }
} 