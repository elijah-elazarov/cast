import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    const fullUrl = `${backendUrl}/api/tiktok/login`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cast-SocialMedia-App/1.0',
        'ngrok-skip-browser-warning': request.headers.get('ngrok-skip-browser-warning') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // Forward error details from backend
    if (!response.ok) {
      console.error('TikTok login backend error:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      return NextResponse.json({
        success: false,
        error: data.detail || data.error || data.message || 'Failed to login to TikTok',
        detail: data.detail,
        message: data.message
      }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('TikTok login proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to backend',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
