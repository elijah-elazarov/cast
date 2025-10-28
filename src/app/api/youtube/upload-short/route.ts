import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, title, description, tags, accessToken } = await request.json();
    
    if (!videoUrl || !title || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Download video from Cloudinary URL
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download video from Cloudinary');
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });

    // Create form data for YouTube upload
    const formData = new FormData();
    formData.append('file', videoBlob, 'video.mp4');

    // YouTube API upload
    const uploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`YouTube upload failed: ${JSON.stringify(errorData)}`);
    }

    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;

    // Update video metadata (title, description, tags, privacy)
    const updateResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: videoId,
        snippet: {
          title: title,
          description: description || '',
          tags: tags || [],
          categoryId: '22' // People & Blogs category
        },
        status: {
          privacyStatus: 'public'
        }
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Failed to update video metadata: ${JSON.stringify(errorData)}`);
    }

    return NextResponse.json({
      success: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      message: 'YouTube Short uploaded successfully'
    });
  } catch (error) {
    console.error('YouTube upload error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to YouTube'
    }, { status: 500 });
  }
}