# Instagram Integration Setup - Refactored 2025

## Overview

This is a modern, web-based Instagram integration using the official **Instagram Graph API**. It enables users to:
- Sign in with Instagram Business/Creator accounts
- Authenticate via OAuth (no username/password needed)
- Upload and publish Reels to Instagram
- Post videos to Instagram Stories

## Key Features

✅ **Official Instagram Graph API** - Meta-supported, secure, reliable  
✅ **Web-based OAuth** - No username/password required  
✅ **Business & Creator Accounts** - Full-featured API access  
✅ **Reels Support** - Upload and publish Reels up to 90 seconds  
✅ **Stories Support** - Post to Instagram Stories  
✅ **Session Management** - Persistent authentication  

## Architecture

### Authentication Flow

```
1. User clicks "Connect with Instagram"
2. Frontend calls → Backend `/api/instagram/meta/auth-url`
3. Backend returns OAuth URL (Facebook login page)
4. User authorizes the app on Facebook
5. Facebook redirects → Backend `/auth/instagram/callback?code=xyz`
6. Backend exchanges code for access token
7. Backend gets user's Facebook Pages
8. Backend gets Instagram Business account from connected Page
9. Backend stores session and redirects to frontend
10. Frontend stores user info in localStorage
11. User is connected and ready to post!
```

### Video Upload Flow

```
1. User selects video file in frontend
2. Frontend uploads to → Backend `/api/instagram/upload-reel`
3. Backend uploads video to cloud storage (public HTTPS URL required)
4. Backend creates Instagram Reel container with video URL
5. Backend publishes Reel using container ID
6. Backend returns success with media ID
```

## Prerequisites

### 1. Instagram Account Requirements

- ✅ **Business Account** OR **Creator Account** (Personal accounts not supported)
- ✅ Must be connected to a **Facebook Page**
- ✅ Admin or Editor role on the connected Facebook Page

### 2. Facebook Developer Setup

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app or select existing app
3. Add **Instagram** product to your app
4. Configure OAuth:
   - Valid OAuth Redirect URIs: `http://localhost:3000/auth/instagram/callback`
   - Valid OAuth Redirect URIs (production): `https://yourdomain.com/auth/instagram/callback`

### 3. App Configuration

**Required Permissions:**
- `instagram_basic` - Basic Instagram info
- `instagram_content_publish` - Post to Instagram
- `pages_show_list` - List connected Pages
- `pages_read_engagement` - Read Page engagement

**App Review:**
- Submit for review with Instagram Content Publishing permission
- Provide detailed use case and screencast
- Approval can take several days

## Environment Variables

### Backend (`backend/.env`)

```env
# Facebook/Instagram App Credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# Base URLs
BASE_URL=http://localhost:8000  # or ngrok URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)

```env
BACKEND_URL=http://localhost:8000  # or your backend URL
```

## Installation Steps

### Step 1: Create Facebook App

1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Business** type
4. Fill in app details:
   - App Name: Your app name
   - App Contact Email: Your email
5. Click **Create App**

### Step 2: Configure Instagram Product

1. In your app dashboard, go to **Products** → **Add Product**
2. Find **Instagram** and click **Set Up**
3. Configure OAuth Redirect URIs:
   ```
   http://localhost:3000/auth/instagram/callback
   https://yourdomain.com/auth/instagram/callback
   ```

### Step 3: Get App Credentials

1. Go to **Settings** → **Basic** in your app
2. Copy **App ID** and **App Secret**
3. Add to `backend/.env`:
   ```env
   FACEBOOK_APP_ID=your_app_id_here
   FACEBOOK_APP_SECRET=your_app_secret_here
   ```

### Step 4: Connect Instagram to Facebook Page

1. Go to [Facebook Pages](https://www.facebook.com/pages)
2. Create or select a Page
3. Go to Page Settings → **Instagram**
4. Click **Connect Account**
5. Log in with your Instagram Business/Creator account
6. Confirm connection

### Step 5: App Review (Production)

Before going live:

1. Go to **App Review** → **Permissions and Features**
2. Request **instagram_content_publish** permission
3. Provide:
   - Use case description
   - Video screencast showing functionality
   - Test account credentials
4. Submit for review (3-7 business days)
5. Once approved, switch app to **Live** mode

## API Endpoints

### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/meta/auth-url` | GET | Get OAuth authorization URL |
| `/auth/instagram/callback` | GET | Handle OAuth callback |
| `/api/instagram/meta/login` | POST | Exchange code for token |
| `/api/instagram/meta/logout` | POST | Logout user |
| `/api/instagram/upload-reel` | POST | Upload and publish Reel |

### Frontend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/meta/auth-url` | GET | Proxy to backend |
| `/api/instagram/meta/login` | POST | Proxy to backend |
| `/api/instagram/meta/logout` | POST | Proxy to backend |
| `/api/instagram/upload-reel` | POST | Proxy to backend |

## Code Structure

### Backend

```
backend/
├── instagram_graph_api.py     # Instagram Graph API client
├── main.py                     # FastAPI routes
└── sessions/                   # Stored sessions
    └── instagram_sessions.json
```

### Frontend

```
src/app/
├── api/instagram/
│   ├── meta/
│   │   ├── auth-url/route.ts  # Get OAuth URL
│   │   └── login/route.ts     # Exchange code
│   └── upload-reel/route.ts   # Upload Reel
├── auth/instagram/
│   └── callback/page.tsx      # OAuth callback
└── components/
    └── InstagramConnection.tsx # Connection UI
```

## Testing Locally

### 1. Start Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 2. Start Frontend

```bash
npm run dev
# Runs on http://localhost:3000
```

### 3. Test OAuth Flow

1. Navigate to `http://localhost:3000`
2. Click "Connect with Instagram"
3. You'll be redirected to Facebook login
4. Login with Facebook account that has admin access to a Page
5. The Page must be connected to an Instagram Business/Creator account
6. Authorize the app
7. You'll be redirected back with success message

### 4. Test Video Upload

1. With Instagram connected, go to upload page
2. Select a video file (MP4, max 100MB)
3. Add caption
4. Click "Upload"
5. Video should be published as an Instagram Reel

## Common Issues

### "No Facebook Pages found"

**Cause:** User doesn't have admin access to any Facebook Pages, or Page isn't connected to Instagram.

**Solution:**
1. Create a Facebook Page at https://www.facebook.com/pages/create
2. Connect Instagram account to the Page in Page Settings
3. Ensure user is admin or editor of the Page

### "No Instagram Business account connected"

**Cause:** The connected Facebook Page doesn't have an Instagram account linked.

**Solution:**
1. Go to Facebook Page Settings → Instagram
2. Click "Connect Account"
3. Login with Instagram Business/Creator account
4. Confirm connection

### "Video upload failed"

**Cause:** Video must be publicly accessible via HTTPS for Instagram Graph API.

**Solution:**
1. Implement cloud storage (AWS S3, Cloudflare R2, etc.)
2. Upload video to cloud storage first
3. Pass public HTTPS URL to Instagram API

### "Invalid redirect_uri"

**Cause:** OAuth redirect URI doesn't match configured URI.

**Solution:**
1. Check `INSTAGRAM_REDIRECT_URI` in backend environment
2. Ensure it matches exactly in Facebook App Settings
3. Include trailing slash if present in settings

## Production Deployment

### 1. Update Environment Variables

**Backend (Render):**
```env
BASE_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.vercel.app
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://your-frontend.vercel.app/auth/instagram/callback
```

**Frontend (Vercel):**
```env
BACKEND_URL=https://your-backend.onrender.com
```

### 2. Update Facebook App Settings

1. Add production OAuth redirect URI
2. Add production domains
3. Submit for App Review (if not done)
4. Switch to Live mode

### 3. Deploy

```bash
# Deploy backend
git push origin main  # Auto-deploys on Render

# Deploy frontend
vercel --prod
```

## Security Notes

⚠️ **Never commit `.env` files**  
⚠️ **Rotate secrets if exposed**  
⚠️ **Use different credentials for dev/prod**  
⚠️ **Enable HTTPS in production**  
⚠️ **Validate all user inputs**  

## Resources

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Platform Policies](https://developers.facebook.com/policy/)

## Support

For issues:
1. Check logs in backend console
2. Check browser console for frontend errors
3. Verify environment variables are set
4. Ensure Facebook App is in correct mode
5. Check Instagram account type (Business/Creator required)
