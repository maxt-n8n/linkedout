// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const contentType = headersList.get('content-type');
    const service = request.headers.get('x-service');
    const endpoint = request.headers.get('x-endpoint');
    
    if (!service || !endpoint) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }
    
    // Handle n8n service
    if (service === 'n8n') {
      const n8nApiKey = request.headers.get('x-n8n-api-key');
      const pocketbaseToken = request.headers.get('x-pocketbase-token');
      
      if (!n8nApiKey) {
        return NextResponse.json({ error: 'Missing n8n API key' }, { status: 400 });
      }
      
      const body = await request.json();
      
      // Prepare headers for the n8n request
      const requestHeaders: Record<string, string> = {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if PocketBase token is provided
      if (pocketbaseToken) {
        requestHeaders['Authorization'] = `Bearer ${pocketbaseToken}`;
      }
      
      // Get the webhook URL from environment variables with fallback
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      
      if (!n8nWebhookUrl) {
        return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
      }
      
      // Forward to n8n API
      const response = await fetch(`${n8nWebhookUrl}/${endpoint}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
      });
      
      const responseText = await response.text();
      
      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data, { status: response.status });
      } catch {
        return new NextResponse(responseText, { 
          status: response.status,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }
    
    return NextResponse.json({ error: 'Unsupported service' }, { status: 400 });
  } catch (error) {
    console.error('Setup proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
