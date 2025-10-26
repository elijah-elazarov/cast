import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
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

