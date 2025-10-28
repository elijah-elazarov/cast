import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { video_url, target_width, target_height, target_ratio } = await request.json();

    if (!video_url) {
      return NextResponse.json({
        success: false,
        error: 'Video URL is required'
      }, { status: 400 });
    }

    // Call backend to process video
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';

    const response = await fetch(`${backendUrl}/api/instagram/graph/process-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        video_url, 
        target_width: target_width || 720, 
        target_height: target_height || 1280, 
        target_ratio: target_ratio || 9/16 
      }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process video'
    }, { status: 500 });
  }
}
