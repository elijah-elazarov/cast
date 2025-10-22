# YouTube Integration Setup Guide

## Overview
The YouTube integration uses OAuth 2.0 with the official YouTube Data API v3. This is a secure, official method for uploading videos to YouTube Shorts.

> **⚠️ Ngrok Free Limitation:** When using ngrok free tier, users will see an interstitial warning page after authorizing with Google. This is normal and expected - they just need to click "Visit Site" to proceed. To avoid this completely, upgrade to ngrok paid or use Cloudflare Tunnel (see below).

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Cast"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload` (upload videos)
   - `https://www.googleapis.com/auth/youtube.readonly` (read channel info)
5. Add test users (required during development):
   - Click "Add Users"
   - Enter your Google account email(s)
   - Save
6. Click "Save and Continue"

> **Important:** In "Testing" mode, only the test users you add can access the app. Add your Google account email!

### 3. Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Set **Authorized JavaScript origins**:
   ```
   https://your-ngrok-url.ngrok-free.app
   ```
   > Use whatever Ngrok URL is currently active

5. Set **Authorized redirect URIs**:
   ```
   https://your-ngrok-url.ngrok-free.app/auth/youtube/callback
   ```
   
   > **Note:** 
   > - Replace `your-ngrok-url.ngrok-free.app` with your actual Ngrok URL from `ngrok http 3000`
   > - **Cannot** use `localhost` URLs - Google cannot redirect to localhost
   > - Check your current Ngrok URL: `ngrok http 3000` (shown in terminal)
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 4. Add to Environment Variables
Create or edit `backend/.env` file:
```env
# Base URL - Loaded dynamically from .env at runtime
# NO CODE CHANGES NEEDED - Just update this value when Ngrok URL changes
BASE_URL=https://your-ngrok-url.ngrok-free.app

# YouTube OAuth Configuration
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
```

> **Important:** 
> - **File location:** `backend/.env` (not the root directory)
> - **Dynamic loading:** Backend reads `BASE_URL` from `.env` at startup - no code changes needed!
> - **Ngrok URL:** Check `ngrok http 3000` terminal output for your current URL
> - **Client credentials:** Replace placeholders with values from Google Cloud Console
> - **Public URL required:** Cannot use `localhost` - Google OAuth requires publicly accessible URL

### 5. Restart Backend
The backend will automatically pick up the new environment variables.

## How It Works

### Authentication Flow
1. User clicks "Connect YouTube"
2. Backend generates OAuth URL
3. User redirected to Google OAuth page
4. User grants permissions
5. Google redirects back with authorization code
6. Backend exchanges code for access token
7. Connection complete

### Upload Flow
1. User selects video file
2. Optionally adds caption/description
3. Clicks "Upload to YouTube" (or "Upload to All Platforms")
4. Video is uploaded via YouTube Data API v3
5. Title automatically includes `#Shorts` tag
6. Video is published as a Short

## Features

✅ **Official API** - Uses YouTube Data API v3 (secure & reliable)  
✅ **OAuth 2.0** - Industry-standard authentication  
✅ **Auto-#Shorts** - Automatically tags videos as Shorts  
✅ **Multi-platform** - Upload to Instagram and YouTube simultaneously  
✅ **Token Refresh** - Automatically refreshes expired tokens  

## Requirements

### Video Requirements
- Format: MP4 or MOV
- Max file size: 100MB
- Max duration: 90 seconds
- Recommended aspect ratio: 9:16 (vertical)
- Max resolution: 1920x1080

### API Quotas
- Default quota: 10,000 units/day
- Video upload uses ~1,600 units per upload
- Monitor quota usage in Google Cloud Console

## Ngrok Warning Page

When OAuth redirects back through Ngrok, you may see a warning page asking you to verify the site.

**Solution:** Click "Visit Site" button to proceed. This warning appears because you're using the free Ngrok tier.

**To skip the warning page:**
1. Start Ngrok with custom header flag:
   ```bash
   ngrok http 3000 --request-header-add="ngrok-skip-browser-warning: true"
   ```
2. Or upgrade to a paid Ngrok account

## Troubleshooting

### "Failed to initialize YouTube connection"
- Check that `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are set in `backend/.env`
- Check that `BASE_URL` matches your current Ngrok URL
- Restart the backend server

### "Ngrok URL Changed"
When Ngrok generates a new URL, update **two places** (no code changes needed!):

1. **backend/.env** - Update `BASE_URL` value
   ```env
   BASE_URL=https://new-ngrok-url.ngrok-free.app
   ```

2. **Google Cloud Console** - Update the OAuth URLs to match:
   - Authorized JavaScript origins: `https://new-ngrok-url.ngrok-free.app`
   - Authorized redirect URIs: `https://new-ngrok-url.ngrok-free.app/auth/youtube/callback`

3. **Restart backend** - `npm run dev:full`

> **Key point:** The backend dynamically reads `BASE_URL` from `.env` at startup - you only need to edit the `.env` file, no code changes required!

### "Access blocked - Error 403: access_denied"
**Problem:** App hasn't completed Google verification process

**Solution:**
1. Go to OAuth consent screen in Google Cloud Console
2. Make sure app is in "Testing" mode
3. **Add your Google account email** as a test user
4. Save and try again

Only test users can access the app during development!

### "Upload failed"
- Check API quota hasn't been exceeded
- Verify video meets requirements
- Check backend logs for detailed error messages

### Token Expired
- Backend automatically refreshes tokens
- If issues persist, disconnect and reconnect YouTube

## Security Notes

- Never commit `.env` file to version control
- OAuth credentials should be kept secure
- In production, use HTTPS for redirect URIs
- Consider adding rate limiting for uploads

## Alternatives to Ngrok Free

If you want to avoid the interstitial warning page, consider these alternatives:

### Option 1: Cloudflare Tunnel (Free)
```bash
# Install cloudflared
brew install cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create cast-app

# Run the tunnel
cloudflared tunnel --url http://localhost:3000
```

Use the provided HTTPS URL in your Google Cloud Console settings.

### Option 2: Ngrok Paid ($8/month)
Upgrading to ngrok paid removes the interstitial page and adds other features.

### Option 3: Accept the Ngrok Free Flow
Users just need to click "Visit Site" once - this is perfectly acceptable for development/testing.

## Next Steps

1. Set up Google Cloud project
2. Add credentials to `.env`
3. Restart backend: `npm run dev:full`
4. Test connection and upload!
5. When users see the ngrok interstitial, they should click "Visit Site"
