import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get form data from request
    const formData = await request.formData();
    
    // Proxy request to backend
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) throw new Error('BACKEND_URL environment variable is required');
    
    // Set custom User-Agent for ngrok bypass and app identification
    // Note: We can't set Content-Type for FormData, but we can set User-Agent
    const response = await fetch(`${backendUrl}/api/instagram/upload-reel`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Cast-SocialMedia-App/1.0 (Social Media Content Publisher)',
      },
      body: formData,
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram upload-reel proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}


