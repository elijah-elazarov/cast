import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { page_id, page_access_token } = await request.json();
    
    if (!page_id || !page_access_token) {
      return NextResponse.json({
        success: false,
        error: 'Page ID and page access token are required'
      }, { status: 400 });
    }

    // Call your backend to get Instagram account from page
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/instagram/graph/instagram-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_id, page_access_token }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instagram account error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get Instagram account'
    }, { status: 500 });
  }
}
