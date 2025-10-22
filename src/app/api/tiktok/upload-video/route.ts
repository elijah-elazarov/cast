import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const backendUrl = 'http://localhost:8000/api/tiktok/upload-video';
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Cast-SocialMedia-App/1.0',
        'ngrok-skip-browser-warning': request.headers.get('ngrok-skip-browser-warning') || '',
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('TikTok upload proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

