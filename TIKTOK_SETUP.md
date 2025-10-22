# TikTok Integration Setup Guide

## Overview
The TikTok integration uses OAuth 2.0 with the official TikTok Content Posting API. This is a secure, official method for uploading videos to TikTok.

> **⚠️ Important:** TikTok requires application approval before you can use the Content Posting API. The approval process may take several days to weeks.

## Setup Steps

### 1. Create TikTok Developer Account
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Click "Register" or "Log in"
3. Sign in with your TikTok account
4. Complete the developer registration form
5. Verify your email address

### 2. Create a New Application
1. In the Developer Portal, click "Manage apps"
2. Click "Connect an app" or "Create new app"
3. Fill in required fields:
   - **App name**: Cast (or your app name)
   - **App description**: Social media content publisher
   - **Category**: Social & Entertainment
   - **Website URL**: Your ngrok URL or production domain
   - **Terms of Service URL**: (if applicable)
   - **Privacy Policy URL**: (if applicable)

### 3. Request Content Posting API Access
1. In your app dashboard, go to "Add products"
2. Find "Content Posting API" and click "Add"
3. Fill out the application form:
   - **Use case**: Content publishing and management
   - **Description**: Detailed explanation of how you'll use the API
   - **Estimated daily API calls**: Your expected usage
4. Submit the application
5. Wait for TikTok to review and approve your request

> **Note:** Approval is not instant. TikTok will review your application and may request additional information.

### 4. Configure OAuth 2.0
Once approved:

1. Go to your app's "Settings" page
2. Find "OAuth" or "Login Kit" section
3. Configure redirect URIs:
   ```
   https://your-ngrok-url.ngrok-free.app/auth/tiktok/callback
   ```
   
   > **Important:** 
   > - Replace `your-ngrok-url.ngrok-free.app` with your actual Ngrok URL from `ngrok http 3000`
   > - **Cannot** use `localhost` URLs - TikTok requires publicly accessible URLs
   > - Update this URL in TikTok Developer Portal whenever your Ngrok URL changes

### 5. Get API Credentials
1. In your app dashboard, find the "Basic Information" or "Credentials" section
2. Copy your **Client Key** (like Client ID)
3. Copy your **Client Secret**
4. Keep these secure - never commit them to version control

### 6. Add to Environment Variables
Create or edit `backend/.env` file:
```env
# Base URL - Must be publicly accessible (Ngrok, production domain, etc.)
BASE_URL=https://your-ngrok-url.ngrok-free.app

# TikTok OAuth Configuration
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
```

> **Important:** 
> - **File location:** `backend/.env` (not the root directory)
> - **Public URL required:** Cannot use `localhost` - TikTok OAuth requires publicly accessible URL
> - **Ngrok URL:** Check `ngrok http 3000` terminal output for your current URL
> - **Client credentials:** Replace placeholders with values from TikTok Developer Portal

### 7. Install Dependencies
If you haven't already:
```bash
cd backend
pip install -r requirements.txt
```

### 8. Restart Backend
The backend will automatically pick up the new environment variables:
```bash
# If using npm run dev:full, restart it
# Or restart the backend separately:
cd backend
python3 main.py
```

## How It Works

### OAuth 2.0 Flow
```
1. User clicks "Connect TikTok"
   ↓
2. Frontend requests auth URL from backend
   ↓
3. Backend generates TikTok OAuth URL with:
   - client_key
   - redirect_uri
   - scopes (user.info.basic, video.upload, video.publish)
   - state (for CSRF protection)
   ↓
4. User redirects to TikTok authorization page
   ↓
5. User authorizes the application
   ↓
6. TikTok redirects back with authorization code
   ↓
7. Frontend sends code to backend
   ↓
8. Backend exchanges code for access token
   ↓
9. Backend fetches user info
   ↓
10. User info stored in session
    ↓
11. User redirected back to main page
```

### Video Upload Flow
```
1. User selects video file
   ↓
2. User adds title/description
   ↓
3. Frontend sends video + metadata to backend
   ↓
4. Backend initializes upload with TikTok API:
   - POST /v2/post/publish/video/init/
   - Receives upload_url and publish_id
   ↓
5. Backend uploads video file:
   - PUT to upload_url
   ↓
6. Video published to TikTok
   ↓
7. Success response returned to user
```

## API Endpoints

### Backend Endpoints
- `GET /api/tiktok/auth-url` - Generate OAuth authorization URL
- `POST /api/tiktok/login` - Exchange authorization code for tokens
- `POST /api/tiktok/upload-video` - Upload video to TikTok
- `POST /api/tiktok/logout` - Clear TikTok session

### Frontend API Proxy Routes
- `/api/tiktok/auth-url/route.ts` - Proxy for auth URL
- `/api/tiktok/login/route.ts` - Proxy for login
- `/api/tiktok/upload-video/route.ts` - Proxy for upload
- `/api/tiktok/logout/route.ts` - Proxy for logout

## Required Scopes

The application requests the following TikTok API scopes:
- `user.info.basic` - Read basic user information
- `video.upload` - Upload videos
- `video.publish` - Publish videos to TikTok

## Video Requirements

### TikTok Video Specifications
- **Format**: MP4
- **Max Duration**: 60 seconds (for most accounts)
- **Max File Size**: 287MB (for most accounts)
- **Aspect Ratio**: 9:16 recommended (vertical)
- **Min Resolution**: 720x1280
- **Max Resolution**: 1080x1920
- **Frame Rate**: 23-60 FPS
- **Codec**: H.264 or H.265

## Privacy Levels

When uploading, videos are set to:
- `SELF_ONLY` (private by default for testing)

You can modify the `privacy_level` in `backend/main.py`:
- `PUBLIC_TO_EVERYONE` - Public
- `MUTUAL_FOLLOW_FRIENDS` - Friends
- `SELF_ONLY` - Private

## Troubleshooting

### Application Not Approved
**Issue**: Can't connect TikTok account
**Solution**: Your application must be approved by TikTok first. Check your email and developer dashboard for status updates.

### Redirect URI Mismatch
**Issue**: Error during OAuth redirect
**Solution**: 
- Ensure `BASE_URL` in `backend/.env` matches TikTok Developer Portal redirect URI
- Update TikTok Developer Portal if Ngrok URL changed
- Format must be: `https://your-ngrok-url.ngrok-free.app/auth/tiktok/callback`

### Invalid Client Key
**Issue**: Authorization fails
**Solution**: 
- Verify `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` are correct
- Check for extra spaces or quotes
- Ensure credentials are from the correct app

### Upload Fails
**Issue**: Video upload returns error
**Solution**:
- Check video meets specifications (format, size, duration)
- Verify user is logged in (check localStorage for `tiktok_user_id`)
- Check backend logs for detailed error messages
- Ensure Content Posting API is approved and active

### Ngrok Interstitial
**Issue**: Warning page after OAuth redirect
**Solution**: 
- Click "Visit Site" to continue (ngrok free tier limitation)
- API calls bypass this automatically with custom headers
- Consider upgrading to ngrok paid or using Cloudflare Tunnel

### Token Expired
**Issue**: Upload fails with authentication error
**Solution**: 
- Log out and log back in to get fresh tokens
- Tokens are stored in-memory and cleared on server restart
- Consider implementing token refresh (future enhancement)

## Testing

### Pre-Approval Testing
Before TikTok approves your application:
- You can test OAuth flow with test accounts
- Add your TikTok account as a test user in Developer Portal
- Upload functionality won't work until approved

### Post-Approval Testing
1. Connect your TikTok account
2. Upload a test video (starts as private)
3. Check TikTok app to verify video uploaded
4. Test disconnect/reconnect flow
5. Test multi-platform upload (with Instagram/YouTube)

## Rate Limits

TikTok enforces rate limits on their API:
- **OAuth**: 5 requests per second
- **User Info**: 1000 requests per day
- **Video Upload**: Varies by account status

Exceeding limits will result in 429 (Too Many Requests) errors.

## Best Practices

1. **Handle Errors Gracefully**: TikTok API can be strict, implement proper error handling
2. **Test with Test Accounts**: Use TikTok's test user feature during development
3. **Monitor Logs**: Check backend logs for detailed error messages
4. **Update Ngrok URL**: Remember to update both `backend/.env` and TikTok Developer Portal
5. **Respect Rate Limits**: Implement retry logic with exponential backoff
6. **Keep Credentials Secure**: Never commit `.env` files to version control

## Production Deployment

When deploying to production:
1. Replace Ngrok URL with your actual domain
2. Update redirect URI in TikTok Developer Portal
3. Update `BASE_URL` in production environment variables
4. Ensure HTTPS is configured
5. Submit app for public review (if making publicly available)
6. Implement proper error logging and monitoring

## Additional Resources

- [TikTok for Developers](https://developers.tiktok.com/)
- [TikTok API Documentation](https://developers.tiktok.com/doc/overview/)
- [Content Posting API Guide](https://developers.tiktok.com/doc/content-posting-api-get-started/)
- [Developer Guidelines](https://developers.tiktok.com/doc/our-guidelines-developer-guidelines/)
- [TikTok Login Kit](https://developers.tiktok.com/doc/login-kit-web/)

## Support

For TikTok API issues:
- Check [TikTok Developer Community](https://developers.tiktok.com/community/)
- Contact TikTok Developer Support through the portal
- Review TikTok's [FAQ section](https://developers.tiktok.com/doc/faq/)

