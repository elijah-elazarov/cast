import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;
    const user_id = formData.get('user_id') as string;
    
    if (!file || !user_id) {
      return NextResponse.json({
        success: false,
        error: 'File and user_id are required'
      }, { status: 400 });
    }

    // Call your backend to upload reel
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com';
    
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('caption', caption || '');
    backendFormData.append('user_id', user_id);
    
    const response = await fetch(`${backendUrl}/api/instagram/graph/upload-reel`, {
      method: 'POST',
      body: backendFormData,
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload reel error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload reel'
    }, { status: 500 });
  }
}