# YouTube Shorts Integration - Quick Start

## How It Works

**Dynamic Configuration:** The backend loads `BASE_URL` from `backend/.env` at runtime.  
**No Code Changes:** When Ngrok URL changes, just update `.env` file!

## Setup Steps

### 1. Get Your Current Ngrok URL
Run `ngrok http 3000` and copy the HTTPS URL shown:
```
Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000
                              ↑ Copy this
```

### 2. Update Google Cloud Console
Go to OAuth credentials and set:
- **Authorized JavaScript origins:** `https://abc123.ngrok-free.app` (use your actual URL)
- **Authorized redirect URIs:** `https://abc123.ngrok-free.app/auth/youtube/callback`

### 3. Create backend/.env
```env
# Backend dynamically reads this at startup - no code changes needed!
BASE_URL=https://abc123.ngrok-free.app
YOUTUBE_CLIENT_ID=your_actual_client_id
YOUTUBE_CLIENT_SECRET=your_actual_client_secret
```

### 4. Run the App
```bash
npm run dev:full
```

## When Ngrok URL Changes

Update **two places** (no code changes needed!):

1. **backend/.env** - Update `BASE_URL` value
2. **Google Cloud Console** - Update OAuth URLs to match
3. **Restart:** `npm run dev:full`

## Testing

1. Start Ngrok: `ngrok http 3000`
2. Copy the HTTPS URL from Ngrok terminal
3. Update `backend/.env` with that URL
4. Update Google Cloud Console to match
5. Restart: `npm run dev:full`
6. Open your app via Ngrok URL
7. Click "Connect YouTube" and authorize
8. Upload a video!

## Troubleshooting

**"BASE_URL environment variable is required"**
- Create `backend/.env` file with `BASE_URL=your-ngrok-url`
- Backend dynamically reads from `.env` at startup

**"Access blocked - Error 403: access_denied"**
- Go to OAuth consent screen in Google Cloud Console
- Add your Google account email as a test user
- Save and try again

**"Failed to initialize YouTube connection"**
- Check `backend/.env` has correct `BASE_URL` matching your current Ngrok URL
- Verify Google Cloud Console URLs match exactly
- Verify credentials in `backend/.env`
- Make sure you're added as a test user in OAuth consent screen

**OAuth redirect fails**
- All URLs must match exactly (backend reads from `.env` dynamically):
  - Google Console authorized JavaScript origins
  - Google Console redirect URIs  
  - `backend/.env` BASE_URL value

