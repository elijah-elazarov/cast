import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const backendUrl = `${base}/api/tiktok/upload-video`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Cast-SocialMedia-App/1.0',
        'ngrok-skip-browser-warning': request.headers.get('ngrok-skip-browser-warning') || '',
      },
      body: formData,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      data = { success: false, detail: text } as unknown;
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('TikTok upload proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}

