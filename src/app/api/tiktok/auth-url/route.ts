import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    const fullUrl = `${backendUrl}/api/tiktok/auth-url`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cast-SocialMedia-App/1.0',
        'ngrok-skip-browser-warning': request.headers.get('ngrok-skip-browser-warning') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('TikTok auth URL proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get auth URL' },
      { status: 500 }
    );
  }
}

