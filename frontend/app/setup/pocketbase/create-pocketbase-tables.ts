// app/setup/pocketbase/create-pocketbase-tables.ts
import { SetupStatus } from './types';
import { getConfigValue } from '@/lib/config-utils';

export async function createPocketbaseTables(
  n8nApiKey: string,
  pocketbaseSuperuserEmail: string,
  pocketbaseSuperuserPassword: string,
  setError: (error: string | null) => void
): Promise<boolean> {
  try {
    console.log("Creating tables in PocketBase...");
    
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
    console.log("Calling n8n webhook to create tables in PocketBase...");
    
    try {
      const webhookResponse = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service': 'n8n',
          'x-endpoint': 'webhook/linkedout/setup/tables',
          'x-n8n-api-key': n8nApiKey,
          'x-pocketbase-token': authToken
        },
        body: JSON.stringify({
          pocketbaseUrl: process.env.NEXT_PUBLIC_POCKETBASE_URL
        })
      });
      
      console.log("Webhook response status:", webhookResponse.status);
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("PocketBase tables creation failed:", errorText);
        throw new Error(`Failed to create tables in PocketBase (Status: ${webhookResponse.status}): ${errorText}`);
      }
      
      // Log the raw response for debugging
      const responseText = await webhookResponse.text();
      console.log("Raw webhook response:", responseText);
      
      // Parse the response
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("Parsed tables creation result:", result);
      } catch (parseError) {
        console.error("Failed to parse webhook response as JSON:", parseError);
        throw new Error("Failed to parse webhook response as JSON");
      }
      
      // Check if the response indicates success
      if (result.success || result.response === "success") {
        console.log("Tables created successfully in PocketBase");
      } else {
        console.warn("Warning: success indicator not found in webhook response");
        console.warn("Response received:", result);
        throw new Error("Tables creation response did not indicate success");
      }
      
      console.log("Successfully created tables in PocketBase");
      return true;
    } catch (error: any) {
      console.error("Error calling webhook:", error);
      setError(error instanceof Error ? error.message : 'Failed to create tables in PocketBase');
      return false;
    }
  } catch (error) {
    console.error('Error creating PocketBase tables:', error);
    setError(error instanceof Error ? error.message : 'Failed to create tables in PocketBase');
    return false;
  }
}