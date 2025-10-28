import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { authData } = await request.json();
    
    if (!authData || !authData.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication data'
      }, { status: 400 });
    }

    // Get user info from YouTube API
    const userResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info from YouTube');
    }

    const userData = await userResponse.json();
    const channel = userData.items?.[0];

    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    const userInfo = {
      id: channel.id,
      username: channel.snippet?.title || 'Unknown',
      email: '', // YouTube API doesn't provide email in this scope
      channelTitle: channel.snippet?.title || 'Unknown Channel',
      channelId: channel.id
    };

    return NextResponse.json({
      success: true,
      userInfo,
      accessToken: authData.access_token,
      refreshToken: authData.refresh_token
    });
  } catch (error) {
    console.error('YouTube login error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to login with YouTube'
    }, { status: 500 });
  }
}