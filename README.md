# Cast - Social Media Content Publisher

A modern web application for connecting and publishing content across Instagram, YouTube, and TikTok platforms. Built with Next.js 15, TypeScript, Tailwind CSS, and Python FastAPI.

## Features

- **Instagram Integration**: Direct login with Instagram accounts to publish Reels
- **YouTube Integration**: OAuth 2.0 authentication to publish Shorts
- **TikTok Integration**: OAuth 2.0 authentication to publish videos
- **Multi-Platform Upload**: Upload videos to all three platforms simultaneously
- **Video Upload**: Drag-and-drop video upload with validation
- **Real-time Progress**: Upload progress tracking and status updates
- **Responsive Design**: Modern UI that works on all devices
- **Dark Mode Support**: Built-in dark/light theme support
- **Beautiful Loading Experience**: Smooth animated loading sequences

## Prerequisites

- Node.js 22.11.0 (use `nvm use 22.11.0`)
- Python 3.10+
- Ngrok (for YouTube OAuth development)
- Google Cloud Project with YouTube Data API v3 enabled

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd cast
nvm use 22.11.0
npm install
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Set Up Environment Variables

Create a `backend/.env` file:

```env
# Base URL (use Ngrok URL for YouTube OAuth in development)
BASE_URL=https://your-ngrok-url.ngrok-free.app

# YouTube API Credentials (from Google Cloud Console)
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
```

### 3. Set Up Ngrok (for YouTube OAuth)

1. Install ngrok: https://ngrok.com/download
2. Start ngrok on port 3000:
   ```bash
   ngrok http 3000
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
4. Update `BASE_URL` in `backend/.env` with your ngrok URL

### 4. Configure Google Cloud (for YouTube)

See [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md) for detailed instructions on:
- Creating a Google Cloud Project
- Enabling YouTube Data API v3
- Setting up OAuth 2.0 credentials
- Configuring authorized redirect URIs

### 5. Run the Development Server

Start both backend and frontend:

```bash
npm run dev:full
```

This will start:
- Backend API server on http://localhost:8000
- Frontend Next.js app on http://localhost:3000

You can also run them separately:
- Frontend only: `npm run dev`
- Backend only: `npm run dev:backend` or `cd backend && python3 main.py`

Open your ngrok URL (e.g., https://abc123.ngrok-free.app) to use the application.

## Platform Integrations

### Instagram
- **Method**: Direct login using `instagrapi` library
- **Features**:
  - Username/password authentication
  - 2FA support
  - Reel uploads with captions
  - Session persistence across restarts
- **Note**: Uses Instagram's unofficial API

### YouTube
- **Method**: OAuth 2.0 with YouTube Data API v3
- **Features**:
  - Channel authentication
  - Shorts uploads (vertical videos)
  - Title and description support
  - Official API with full compliance
- **Requirements**: Google Cloud Project with OAuth consent screen

### TikTok
- **Method**: OAuth 2.0 with TikTok Content Posting API
- **Features**:
  - OAuth 2.0 authentication
  - Video uploads
  - Title and description support
  - Official API with full compliance
- **Requirements**: TikTok Developer App approval (may take days/weeks)

## Project Structure

```
cast/
├── src/app/
│   ├── api/                    # Next.js API proxy routes
│   │   ├── instagram/         # Instagram endpoints
│   │   └── youtube/           # YouTube endpoints
│   ├── auth/
│   │   └── youtube/callback/  # YouTube OAuth callback
│   ├── components/            # React components
│   │   ├── InstagramConnection.tsx
│   │   ├── YouTubeConnection.tsx
│   │   └── VideoUploader.tsx
│   ├── page.tsx              # Main dashboard
│   └── layout.tsx            # Root layout
├── backend/
│   ├── main.py               # FastAPI backend
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Backend environment variables
├── package.json              # Node.js dependencies
└── README.md                 # This file
```

## Video Requirements

### Instagram Reels
- **Format**: MP4 or MOV
- **Max Duration**: 90 seconds
- **Aspect Ratio**: 9:16 recommended
- **Max Resolution**: 1920x1080

### YouTube Shorts
- **Format**: MP4
- **Max Duration**: 60 seconds
- **Aspect Ratio**: 9:16 (vertical)
- **Max File Size**: Varies by account

## Security & Best Practices

### Instagram
- Credentials never stored in frontend
- Session data persisted securely in backend
- 2FA support for enhanced security
- Uses unofficial API (use at your own risk)

### YouTube
- OAuth 2.0 standard authentication
- No credential storage required
- Token-based authentication
- Official API with full support

### General
- API calls proxied through Next.js API routes
- Environment variables for all secrets
- Ngrok headers to bypass interstitial pages
- HTTPS enforced for all production deployments

## Documentation

- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [YOUTUBE_SETUP.md](./YOUTUBE_SETUP.md) - Detailed YouTube setup instructions
- [TIKTOK_SETUP.md](./TIKTOK_SETUP.md) - Detailed TikTok setup instructions
- [QUICKSTART_YOUTUBE.md](./QUICKSTART_YOUTUBE.md) - YouTube quick reference
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Testing checklist
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Complete system documentation

## Troubleshooting

### Ngrok Interstitial Warning
- The ngrok free tier shows a warning page on first visit
- Click "Visit Site" to continue
- Subsequent API calls bypass this automatically

### YouTube OAuth Errors
- Ensure `BASE_URL` in `backend/.env` matches your current ngrok URL
- Verify redirect URI in Google Cloud Console matches `{BASE_URL}/auth/youtube/callback`
- Check that YouTube Data API v3 is enabled
- Ensure correct scopes are configured

### Instagram Login Errors
- Verify credentials are correct
- Check if 2FA is enabled on your account
- Instagram may temporarily block login attempts - wait and retry

## Future Enhancements

- **Cloud Storage**: S3 or Cloudflare for video hosting
- **Scheduling**: Schedule posts for optimal times
- **Analytics**: Cross-platform engagement analytics
- **Batch Upload**: Upload multiple videos simultaneously

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [YouTube Data API documentation](https://developers.google.com/youtube/v3)
- Review the [instagrapi documentation](https://github.com/adw0rd/instagrapi)
