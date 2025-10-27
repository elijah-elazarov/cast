import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/instagram/graph/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the full response for debugging
    console.log('[API PROXY] Backend response:', JSON.stringify(data, null, 2));
    
    // Check if session_info is missing
    if (!data.session_info) {
      console.error('[API PROXY] WARNING: Backend response missing session_info!');
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instagram Graph login error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to login with Instagram' },
      { status: 500 }
    );
  }
}
