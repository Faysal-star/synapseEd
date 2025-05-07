import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'SynapseED Frontend is running',
    timestamp: new Date().toISOString()
  });
}