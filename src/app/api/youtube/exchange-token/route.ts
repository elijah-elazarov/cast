import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code required'
      }, { status: 400 });
    }

    // Use backend's YouTube login endpoint for token exchange
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    const response = await fetch(`${backendUrl}/api/youtube/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Backend token exchange failed: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      authData: data
    });
  } catch (error) {
    console.error('YouTube token exchange error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exchange token'
    }, { status: 500 });
  }
}
