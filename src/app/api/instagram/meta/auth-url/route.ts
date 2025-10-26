import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Set custom User-Agent for ngrok bypass and app identification
    const headers: HeadersInit = {
      'User-Agent': 'Cast-SocialMedia-App/1.0 (Social Media Content Publisher)',
    };
    
    // Forward the ngrok-skip-browser-warning header to bypass ngrok interstitial
    const ngrokHeader = request.headers.get('ngrok-skip-browser-warning');
    if (ngrokHeader) {
      headers['ngrok-skip-browser-warning'] = ngrokHeader;
    }
    
          const response = await fetch(`${backendUrl}/api/instagram/basic/auth-url`, {
      headers,
    });
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram Meta auth-url proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}

