import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com'}/auth/youtube/callback`;
    const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'YouTube client ID not configured'
      }, { status: 500 });
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return NextResponse.json({
      success: true,
      data: {
        auth_url: authUrl.toString(),
        state: 'youtube_auth_state' // Add state for consistency
      }
    });
  } catch (error) {
    console.error('YouTube auth URL error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate auth URL'
    }, { status: 500 });
  }
}