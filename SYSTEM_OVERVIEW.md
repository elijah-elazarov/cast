# Cast - System Overview

## Executive Summary

Cast is a social media content publisher that enables users to upload videos to Instagram Reels and YouTube Shorts from a single interface. The system uses a hybrid architecture with a Next.js frontend and Python FastAPI backend.

## Architecture

### Tech Stack

**Frontend:**
- Next.js 15 (React 19)
- TypeScript
- Tailwind CSS
- Lucide Icons

**Backend:**
- Python 3.10+
- FastAPI
- instagrapi (Instagram)
- google-api-python-client (YouTube)

**Development Tools:**
- Node.js 22.11.0 (managed via nvm)
- Ngrok (for YouTube OAuth in development)
- Concurrently (for running multiple dev servers)

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│                  (Port 3000 via Ngrok)                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────┐    │
│  │   Main Dashboard │  │   Loading Experience      │    │
│  │   - Platform     │  │   - Multi-phase progress  │    │
│  │     cards        │  │   - Smooth transitions    │    │
│  │   - Video        │  │   - 3-2-1 countdown       │    │
│  │     uploader     │  │   - Completion state      │    │
│  └──────────────────┘  └──────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Next.js API Proxy Routes                 │   │
│  │  - Handles CORS and mixed content issues         │   │
│  │  - Forwards requests to Python backend           │   │
│  │  - Adds custom headers (ngrok-skip, User-Agent)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────┐
│               Python FastAPI Backend                     │
│                   (Port 8000 localhost)                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────┐    │
│  │ Instagram API   │    │ YouTube API             │    │
│  │ (instagrapi)    │    │ (Official OAuth 2.0)    │    │
│  │                 │    │                         │    │
│  │ - Direct login  │    │ - OAuth flow            │    │
│  │ - 2FA support   │    │ - Token management      │    │
│  │ - Reel upload   │    │ - Shorts upload         │    │
│  │ - Session       │    │ - Channel info          │    │
│  │   persistence   │    │                         │    │
│  └─────────────────┘    └─────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              External APIs & Services                    │
├─────────────────────────────────────────────────────────┤
│  Instagram (Unofficial)     Google OAuth / YouTube API  │
└─────────────────────────────────────────────────────────┘
```

## Platform Integrations

### Instagram Integration

**Method:** Direct login using instagrapi library

**Flow:**
1. User enters username/password
2. Backend attempts login via instagrapi
3. If 2FA required, prompts for verification code
4. Session stored in-memory and persisted to disk
5. Account info fetched and displayed

**Features:**
- Direct authentication (no OAuth)
- 2FA support (SMS/authenticator codes)
- Reel uploads with captions
- Session persistence across server restarts
- Share to feed option

**API Endpoints:**
- `POST /api/instagram/login` - Login with credentials
- `POST /api/instagram/logout` - Clear session
- `GET /api/instagram/account-info` - Fetch account details
- `POST /api/instagram/upload-reel` - Upload Reel video

**Storage:**
- Session data: `backend/instagram_sessions/`
- In-memory: `active_sessions` dictionary

**Risk Considerations:**
- Uses unofficial API (may violate ToS)
- Account could be flagged/banned
- No rate limiting implemented
- Use at your own risk

### YouTube Integration

**Method:** OAuth 2.0 with YouTube Data API v3

**Flow:**
1. User clicks "Connect YouTube"
2. Backend generates OAuth URL
3. User redirects to Google consent screen
4. User authorizes application
5. Google redirects with authorization code
6. Backend exchanges code for access token
7. Tokens stored in-memory session
8. Channel info fetched and displayed

**Features:**
- Official OAuth 2.0 authentication
- No credential storage required
- Shorts uploads (vertical videos)
- Title and description support
- Secure token management

**API Endpoints:**
- `GET /api/youtube/auth-url` - Generate OAuth URL
- `POST /api/youtube/login` - Exchange code for tokens
- `POST /api/youtube/logout` - Clear session
- `POST /api/youtube/upload-short` - Upload Short video

**OAuth Scopes:**
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.readonly`

**Storage:**
- In-memory: `youtube_sessions` dictionary
- Session cleared on logout/restart

**Requirements:**
- Google Cloud Project
- YouTube Data API v3 enabled
- OAuth consent screen configured
- Test users added (during development)
- Public URL (ngrok) for redirects

## Data Flow

### Video Upload Flow

```
1. User selects video file
   ↓
2. Frontend validates:
   - File type (video/*)
   - File size (max varies)
   - Duration (≤60s for Shorts, ≤90s for Reels)
   ↓
3. User selects platforms + adds caption/title
   ↓
4. Frontend creates FormData with:
   - video file
   - caption/title
   - description (YouTube)
   - user_id (from localStorage)
   ↓
5. Frontend sends to Next.js API proxy
   ↓
6. Proxy forwards to Python backend
   ↓
7. Backend saves temp file
   ↓
8. Backend uploads to platform API:
   - Instagram: instagrapi.clip_upload()
   - YouTube: build('youtube', 'v3').videos().insert()
   ↓
9. Backend deletes temp file
   ↓
10. Response returned to frontend
    ↓
11. Success/error message displayed
```

### Authentication Persistence

**Instagram:**
- Session saved to `instagram_sessions/{username}.json`
- Client state pickled separately
- Loaded on backend startup
- Persists across server restarts

**YouTube:**
- Tokens stored in-memory only
- Cleared on logout or server restart
- User must re-authenticate after restart
- Follows OAuth best practices

## Environment Variables

### Backend (`backend/.env`)

```env
# Base URL for OAuth redirects (REQUIRED for YouTube)
BASE_URL=https://your-ngrok-url.ngrok-free.app

# YouTube OAuth Credentials
YOUTUBE_CLIENT_ID=your_client_id_from_google_cloud
YOUTUBE_CLIENT_SECRET=your_client_secret_from_google_cloud
```

**Notes:**
- `BASE_URL` must be publicly accessible (cannot use localhost)
- Use ngrok URL in development
- Update `BASE_URL` when ngrok URL changes
- No Instagram credentials needed

### Frontend

No environment variables required.

## File Structure

```
cast/
├── src/app/
│   ├── api/                          # Next.js API proxy routes
│   │   ├── instagram/
│   │   │   ├── account-info/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── upload-reel/route.ts
│   │   └── youtube/
│   │       ├── auth-url/route.ts
│   │       ├── login/route.ts
│   │       ├── logout/route.ts
│   │       └── upload-short/route.ts
│   ├── auth/
│   │   └── youtube/callback/page.tsx  # OAuth callback handler
│   ├── components/
│   │   ├── InstagramConnection.tsx    # Instagram UI
│   │   ├── YouTubeConnection.tsx      # YouTube UI
│   │   └── VideoUploader.tsx          # Upload interface
│   ├── page.tsx                       # Main dashboard
│   ├── layout.tsx                     # Root layout
│   └── globals.css                    # Global styles
├── backend/
│   ├── main.py                        # FastAPI server
│   ├── requirements.txt               # Python dependencies
│   ├── .env                           # Environment variables (gitignored)
│   └── instagram_sessions/            # Persisted IG sessions
├── package.json                       # Node.js config
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind config
├── next.config.ts                     # Next.js config
└── README.md                          # Main documentation
```

## Key Features

### Loading Experience
- **3-phase loading**: Initial (2s) → Starting (2s) → Loading (2s)
- **Countdown phase**: 3-2-1 countdown (3s)
- **Completion phase**: Checkmark display (4s)
- **Total duration**: ~13 seconds
- **Smooth transitions**: Dissolve effects with scale animations
- **Progress bar**: Unified progress across all phases
- **Hydration handling**: No flicker on page refresh

### Video Uploader
- Drag-and-drop support
- File validation
- Platform selection (Instagram, YouTube, or both)
- Custom captions per platform
- Progress feedback
- Error handling

### Connection Management
- Persistent sessions for Instagram
- OAuth flow for YouTube
- Account info display
- Disconnect functionality
- Automatic reconnection on page load

### UI/UX
- Responsive design
- Dark mode support
- Loading states
- Error messages
- Success feedback
- Smooth animations

## Security Considerations

### Instagram
- ⚠️ Uses unofficial API (risk of account issues)
- ✅ No credentials stored in frontend
- ✅ Session data persisted securely
- ✅ 2FA support
- ⚠️ No rate limiting

### YouTube
- ✅ Official OAuth 2.0 flow
- ✅ Token-based authentication
- ✅ No credential storage
- ✅ Secure redirects
- ✅ Proper scope management

### General
- ✅ API calls proxied through Next.js
- ✅ HTTPS enforced (via ngrok in dev)
- ✅ Environment variables for secrets
- ✅ No sensitive data in frontend
- ✅ Custom User-Agent for API identification

## Development Workflow

### Starting the Application

```bash
# Ensure correct Node.js version
nvm use 22.11.0

# Start ngrok (terminal 1)
ngrok http 3000

# Update backend/.env with ngrok URL
# Update Google Cloud Console redirect URI

# Start both servers (terminal 2)
npm run dev:full

# Access via ngrok URL
open https://your-ngrok-url.ngrok-free.app
```

### Making Changes

**Frontend changes:**
- Hot reload enabled
- No server restart needed

**Backend changes:**
- Auto-reload enabled (uvicorn --reload)
- Changes picked up automatically

**Environment variable changes:**
- Requires backend restart
- Update `backend/.env`
- Stop and restart `npm run dev:full`

### Debugging

**Frontend:**
- Browser DevTools console
- Network tab for API calls
- React DevTools

**Backend:**
- Terminal logs (`INFO`, `ERROR`, etc.)
- FastAPI automatic docs: http://localhost:8000/docs
- Print statements in `backend/main.py`

## Common Issues

### Ngrok Interstitial
- **Issue**: Warning page after Google OAuth redirect
- **Cause**: Ngrok free tier limitation
- **Solution**: Click "Visit Site" (one-time per session)
- **Workaround**: Upgrade ngrok or use Cloudflare Tunnel

### YouTube OAuth Errors
- **Issue**: Redirect URI mismatch
- **Solution**: Ensure `BASE_URL` in `.env` matches Google Cloud Console
- **Issue**: Access denied
- **Solution**: Add Google account as test user in OAuth consent screen

### Instagram Login Fails
- **Issue**: CSRF token error
- **Solution**: Removed custom User-Agent (now fixed)
- **Issue**: 2FA required
- **Solution**: Enter 6-digit code when prompted

### Port Conflicts
- **Issue**: Port 3000 or 8000 already in use
- **Solution**: Kill existing processes:
  ```bash
  lsof -ti:3000 | xargs kill -9
  lsof -ti:8000 | xargs kill -9
  ```

## Future Roadmap

### Short-term
- [ ] TikTok integration
- [ ] Batch uploads
- [ ] Upload scheduling
- [ ] Video preview before upload

### Long-term
- [ ] Cloud storage integration (S3/Cloudinary)
- [ ] Analytics dashboard
- [ ] Multi-user support
- [ ] Rate limiting for Instagram
- [ ] Webhook notifications
- [ ] Mobile app

## Maintenance

### Regular Tasks
- Update ngrok URL when it changes
- Monitor for API changes
- Update dependencies regularly
- Check for breaking changes in APIs

### Dependency Updates
```bash
# Frontend
npm update

# Backend
pip install --upgrade -r requirements.txt
```

### Session Cleanup
```bash
# Clear Instagram sessions
rm -rf backend/instagram_sessions/*

# Clear YouTube sessions (restart backend)
```

## Conclusion

Cast provides a streamlined interface for multi-platform video publishing with a focus on ease of use, security, and extensibility. The hybrid architecture allows for flexibility in authentication methods while maintaining a clean separation of concerns.

