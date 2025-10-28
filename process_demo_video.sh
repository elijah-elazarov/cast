#!/bin/bash

# Process demo.mp4 for Instagram Reels using Meta-compatible encoding
# Based on: https://www.ayrshare.com/docs/help-center/technical-support/video_publishing_fails

echo "Processing demo.mp4 for Instagram Reels..."

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install it first:"
    echo "   macOS: brew install ffmpeg"
    echo "   Linux: sudo apt install ffmpeg"
    echo "   Windows: winget install ffmpeg"
    exit 1
fi

# Check if demo.mp4 exists
if [ ! -f "backend/demo.mp4" ]; then
    echo "❌ demo.mp4 not found in backend/ directory"
    exit 1
fi

# Create processed video with Instagram-compatible encoding
# Based on: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media#creating
echo "🔄 Processing video with Instagram-compatible encoding..."
ffmpeg -i backend/demo.mp4 \
    -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280:(iw-720)/2:(ih-1280)/2" \
    -c:v libx264 \
    -preset medium \
    -profile:v high \
    -level 4.0 \
    -pix_fmt yuv420p \
    -g 30 \
    -keyint_min 30 \
    -sc_threshold 0 \
    -b:v 5000k \
    -maxrate 25000k \
    -bufsize 50000k \
    -c:a aac \
    -ar 48000 \
    -ac 2 \
    -b:a 128k \
    -movflags +faststart \
    -t 900 \
    -fs 300M \
    -y \
    backend/demo_instagram_reels.mp4

if [ $? -eq 0 ]; then
    echo "✅ Video processed successfully!"
    echo "📁 Output: backend/demo_instagram_reels.mp4"
    echo "🎬 This video should now work with Instagram Reels API"
    
    # Show video info
    echo ""
    echo "📊 Video information:"
    ffprobe -v quiet -print_format json -show_format -show_streams backend/demo_instagram_reels.mp4 | jq '.streams[0] | {width, height, duration, codec_name, profile}'
else
    echo "❌ Video processing failed"
    exit 1
fi
