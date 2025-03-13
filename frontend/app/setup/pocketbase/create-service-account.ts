// app/setup/pocketbase/create-service-account.ts
import { SetupStatus } from './types';
import { getConfigValue } from '@/lib/config-utils';

interface ServiceAccountCredentials {
  PocketBaseServiceUsername: string;
  PocketBaseServicePassword: string;
}

export async function createServiceAccount(
  n8nApiKey: string,
  pocketbaseSuperuserEmail: string,
  pocketbaseSuperuserPassword: string,
  unipileCredentialId: string | null,
  unipileDsn: string | null,
  setError: (error: string | null) => void,
  setCredentials: (credentials: ServiceAccountCredentials) => void
): Promise<boolean> {
  try {
    console.log("Creating service account in PocketBase...");
    
    // First, authenticate with PocketBase to get a valid token
    const pocketbaseUrl = await getConfigValue('pocketbaseUrl');
    if (!pocketbaseUrl) {
      throw new Error('PocketBase URL is not configured');
    }
    
    console.log("PocketBase URL:", pocketbaseUrl);
    
    // Authenticate with PocketBase using the same endpoint as in auth-context.tsx
    let authToken;
    try {
      // Use the same endpoint that works in the login flow
      const authUrl = `${pocketbaseUrl}/api/collections/_superusers/auth-with-password`;
      console.log("Auth URL:", authUrl);
      
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: pocketbaseSuperuserEmail,
          password: pocketbaseSuperuserPassword
        })
      });
      
      console.log("Auth response status:", authResponse.status);
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("PocketBase authentication failed with status:", authResponse.status);
        console.error("Error response:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error data:", errorData);
        } catch (e) {
          console.error("Could not parse error response as JSON");
        }
        
        throw new Error(`Failed to authenticate with PocketBase (Status: ${authResponse.status}). Please check your credentials.`);
      }
      
      const authData = await authResponse.json();
      console.log("Auth response data:", authData);
      
      // Extract token from the response
      authToken = authData.token;
      
      if (!authToken) {
        throw new Error('Failed to get authentication token from PocketBase response');
      }
      
      console.log("Successfully authenticated with PocketBase, token obtained");
    } catch (error: any) {
      console.error("PocketBase authentication failed:", error);
      throw new Error(`Failed to authenticate with PocketBase: ${error.message}`);
    }
    
    // Call the n8n webhook through our API proxy instead of directly
    console.log("Calling n8n webhook to create service account...");
    
    try {
      const webhookResponse = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service': 'n8n',
          'x-endpoint': 'webhook/linkedout/setup/service-user',
          'x-n8n-api-key': n8nApiKey,
          'x-pocketbase-token': authToken
        },
        body: JSON.stringify({
          pocketbaseUrl: process.env.NEXT_PUBLIC_POCKETBASE_URL
        })
      });
      
      console.log("Webhook response status:", webhookResponse.status);
      
      // Read the response text only once
      const responseText = await webhookResponse.text();
      console.log("Raw webhook response:", responseText);
      
      if (!webhookResponse.ok) {
        console.error("PocketBase service account creation failed:", responseText);
        
        // Try to parse the error response and extract the message
        try {
          const errorData = JSON.parse(responseText);
          // Check if the error is in the format { "response": "Error message here" }
          if (errorData.response && typeof errorData.response === 'string') {
            throw new Error(errorData.response);
          }
          // Fall back to the standard error message
          throw new Error(`Failed to create service account in PocketBase (Status: ${webhookResponse.status}): ${responseText}`);
        } catch (parseError) {
          // If we can't parse the JSON or there's another error, use the original error text
          if (parseError instanceof Error && parseError.message !== 'Unexpected token < in JSON at position 0') {
            throw parseError;
          }
          throw new Error(`Failed to create service account in PocketBase (Status: ${webhookResponse.status}): ${responseText}`);
        }
      }
      
      // Parse the response
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("Parsed service account creation result:", result);
      } catch (parseError) {
        console.error("Failed to parse webhook response as JSON:", parseError);
        throw new Error("Failed to parse webhook response as JSON");
      }
      
      // Check if the response contains the required credentials
      if (!result.serviceUsername || !result.servicePassword) {
        console.error("Missing required credentials in response:", result);
        throw new Error("Service account creation failed: Missing required credentials in response");
      }
      
      // Extract credentials from response using the correct field names
      const credentials: ServiceAccountCredentials = {
        PocketBaseServiceUsername: result.serviceUsername,
        PocketBaseServicePassword: result.servicePassword
      };
      
      console.log("Using credentials:", {
        username: credentials.PocketBaseServiceUsername,
        passwordProvided: !!result.servicePassword
      });
      
      // Store the credentials
      setCredentials(credentials);
      console.log("Credentials stored successfully");
      
      console.log("Successfully created service account in PocketBase");
      return true;
    } catch (error: any) {
      console.error("Error calling webhook:", error);
      setError(error instanceof Error ? error.message : 'Failed to create service account');
      return false;
    }
  } catch (error) {
    console.error('Error creating PocketBase service account:', error);
    
    // Only set a generic error if no specific error has been set yet
    if (error instanceof Error && !error.message.includes('Failed to create service account in PocketBase')) {
      setError(error.message);
    } else if (!(error instanceof Error)) {
      setError('Failed to create service account in PocketBase');
    }
    
    return false;
  }
}