import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    pocketbaseUrl: process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || '',
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '',
  });
}
