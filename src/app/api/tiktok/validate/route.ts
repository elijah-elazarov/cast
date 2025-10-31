import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!base) throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is required');
    const backendUrl = `${base}/api/tiktok/validate`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cast-SocialMedia-App/1.0',
        'ngrok-skip-browser-warning': request.headers.get('ngrok-skip-browser-warning') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('TikTok validate proxy error:', error);
    return NextResponse.json(
      { success: false, is_valid: false, error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

