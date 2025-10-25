import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();
    
    if (!access_token) {
      return NextResponse.json({
        success: false,
        error: 'Access token is required'
      }, { status: 400 });
    }

    // Call your backend to get long-lived token
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/instagram/graph/long-lived-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Long-lived token error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get long-lived token'
    }, { status: 500 });
  }
}
