import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) throw new Error('BACKEND_URL environment variable is required');
    console.log('Instagram Meta login proxy - Backend URL:', backendUrl);
    const body = await request.json();
    
          const response = await fetch(`${backendUrl}/api/instagram/graph/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram Meta login proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}

