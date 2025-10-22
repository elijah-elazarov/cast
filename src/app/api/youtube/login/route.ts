import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Proxy request to backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Set custom User-Agent for ngrok bypass and app identification
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Cast-SocialMedia-App/1.0 (Social Media Content Publisher)',
    };
    
    // Forward the ngrok-skip-browser-warning header to bypass ngrok interstitial
    const ngrokHeader = request.headers.get('ngrok-skip-browser-warning');
    if (ngrokHeader) {
      headers['ngrok-skip-browser-warning'] = ngrokHeader;
    }
    
    const response = await fetch(`${backendUrl}/api/youtube/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('YouTube login proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}

