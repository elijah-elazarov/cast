import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/instagram/platform/auth-url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instagram Platform auth URL error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get Instagram Platform auth URL'
    }, { status: 500 });
  }
}
