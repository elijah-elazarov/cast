import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { success: false, detail: 'Username required' },
        { status: 400 }
      );
    }
    
    // Proxy request to backend
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) throw new Error('BACKEND_URL environment variable is required');
    
    // Set custom User-Agent for ngrok bypass and app identification
    const headers: HeadersInit = {
      'User-Agent': 'Cast-SocialMedia-App/1.0 (Social Media Content Publisher)',
    };
    
    // Forward the ngrok-skip-browser-warning header to bypass ngrok interstitial
    const ngrokHeader = request.headers.get('ngrok-skip-browser-warning');
    if (ngrokHeader) {
      headers['ngrok-skip-browser-warning'] = ngrokHeader;
    }
    
    const response = await fetch(`${backendUrl}/api/instagram/account-info?username=${username}`, {
      headers,
    });
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram account-info proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}


