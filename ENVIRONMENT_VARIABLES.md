# Environment Variables Documentation

This document outlines all environment variables used in the Cast application.

## Backend Environment Variables

**Location:** `backend/.env` (local) and Render Dashboard (production)

### Required Variables

| Variable | Description | Example | Used For |
|----------|-------------|---------|----------|
| `BASE_URL` | Backend's own URL | `https://your-backend.onrender.com` | OAuth redirect URIs that OAuth providers call |
| `FRONTEND_URL` | Frontend application URL | `https://your-frontend.vercel.app` | Redirecting users back to frontend after OAuth |
| `YOUTUBE_CLIENT_ID` | Google OAuth Client ID | `205595763733-xxx.apps.googleusercontent.com` | YouTube authentication |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxx` | YouTube authentication |
| `TIKTOK_CLIENT_KEY` | TikTok OAuth Client Key | `your_tiktok_client_key` | TikTok authentication |
| `TIKTOK_CLIENT_SECRET` | TikTok OAuth Client Secret | `your_tiktok_client_secret` | TikTok authentication |
| `FACEBOOK_APP_ID` | Facebook App ID for Instagram | `your_facebook_app_id` | Instagram Graph API authentication |
| `FACEBOOK_APP_SECRET` | Facebook App Secret for Instagram | `your_facebook_app_secret` | Instagram Graph API authentication |
| `INSTAGRAM_REDIRECT_URI` | Instagram OAuth redirect URI | `https://your-frontend.vercel.app/auth/instagram/callback` | Instagram OAuth callback |

### Variable Details

#### `BASE_URL`
- **Purpose:** The publicly accessible URL of your backend server
- **Used in:** OAuth redirect URI configuration
- **Example flow:** When YouTube OAuth completes, Google redirects to `{BASE_URL}/auth/youtube/callback`
- **Local development:** Use ngrok URL (e.g., `https://abc123.ngrok-free.app`)
- **Production:** Use your Render deployment URL

#### `FRONTEND_URL`
- **Purpose:** The URL where your frontend application is hosted
- **Used in:** Backend redirects users here after OAuth callback
- **Example flow:** Backend receives OAuth code → Redirects to `{FRONTEND_URL}/auth/youtube/callback?code=...`
- **Local development:** `http://localhost:3000`
- **Production:** Your Vercel deployment URL

#### OAuth Credentials
- **YouTube:** Obtained from [Google Cloud Console](https://console.cloud.google.com/)
- **TikTok:** Obtained from [TikTok Developer Portal](https://developers.tiktok.com/)
- **Instagram:** Obtained from [Meta for Developers](https://developers.facebook.com/)

#### Instagram Variables
- **`FACEBOOK_APP_ID`:** Your Facebook App ID (used for Instagram Graph API)
- **`FACEBOOK_APP_SECRET`:** Your Facebook App Secret (used for Instagram Graph API)
- **`INSTAGRAM_REDIRECT_URI`:** Where Instagram redirects after OAuth (must match Facebook App settings)

---

## Frontend Environment Variables

**Location:** `.env` or `.env.local` (local) and Vercel Dashboard (production)

### Required Variables

| Variable | Description | Example | Used For |
|----------|-------------|---------|----------|
| `BACKEND_URL` | Backend API URL | `https://your-backend.onrender.com` | API calls from frontend to backend |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook App ID for Instagram SDK | `717044718072411` | Instagram Facebook SDK initialization |

### Variable Details

#### `BACKEND_URL`
- **Purpose:** The URL of your backend API server
- **Used in:** All API proxy routes (`/api/instagram/*`, `/api/youtube/*`, `/api/tiktok/*`)
- **Local development:** `http://localhost:8000`
- **Production:** Your Render deployment URL

#### `NEXT_PUBLIC_FACEBOOK_APP_ID`
- **Purpose:** Facebook App ID for initializing the Facebook SDK on the frontend
- **Used in:** Instagram authentication components (`page.tsx`, `UnifiedVideoUploader.tsx`, `InstagramReelsDebugger.tsx`)
- **Note:** Must match `FACEBOOK_APP_ID` used in the backend
- **Local development:** Same as production value
- **Production:** Your Facebook App ID from [Meta for Developers](https://developers.facebook.com/)

---

## OAuth Flow Architecture

### OAuth Flow

#### YouTube/TikTok OAuth Flow
```
1. User clicks "Connect" → Frontend
2. Frontend calls → Backend /api/youtube/auth-url
3. Backend generates auth URL with redirect_uri = {BASE_URL}/auth/youtube/callback
4. User authorizes on Google/TikTok
5. Google/TikTok redirects to → Backend {BASE_URL}/auth/youtube/callback?code=xyz
6. Backend redirects to → Frontend {FRONTEND_URL}/auth/youtube/callback?code=xyz
7. Frontend processes code → Backend /api/youtube/login
8. Backend exchanges code for tokens → Stores session
9. Frontend receives user info → Updates UI
```

#### Instagram OAuth Flow
```
1. User clicks "Connect Instagram" → Frontend
2. Frontend calls → Backend /api/instagram/meta/auth-url
3. Backend generates Facebook OAuth URL with redirect_uri = {INSTAGRAM_REDIRECT_URI}
4. User authorizes on Facebook/Instagram
5. Facebook redirects to → Frontend {INSTAGRAM_REDIRECT_URI}?code=xyz
6. Frontend processes code → Backend /api/instagram/graph/login
7. Backend exchanges code for access token → Gets Instagram Business account
8. Backend stores session → Returns user info
9. Frontend receives Instagram account info → Updates UI
```

---

## Setting Environment Variables

### Local Development

1. Create `backend/.env`:
   ```bash
   cd backend
   cp .env.example .env
   # Edit with your values
   ```

2. Create `.env.local`:
   ```bash
   cd ..
   cp .env.example .env.local
   # Edit with your values
   ```

### Production (Render)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service
3. Navigate to **Environment** tab
4. Add each variable with its value
5. Save changes (triggers automatic redeployment)

### Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add `BACKEND_URL` with your Render URL
5. Add `NEXT_PUBLIC_FACEBOOK_APP_ID` with your Facebook App ID (same value as backend's `FACEBOOK_APP_ID`)
6. Redeploy your application

---

## Security Notes

⚠️ **Never commit `.env` files to version control!**

- `.env` files are already in `.gitignore`
- Only commit `.env.example` files with placeholder values
- Rotate secrets if accidentally exposed
- Use different credentials for development and production

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Check that `BASE_URL` matches the authorized redirect URI in OAuth provider console
- For YouTube: Must match exactly in Google Cloud Console → Credentials
- For Instagram: Must match exactly in Facebook App Dashboard → Instagram → Basic Display → Valid OAuth Redirect URIs

### Frontend Can't Connect to Backend
- Verify `BACKEND_URL` is set correctly in frontend environment
- Check CORS settings in backend allow your frontend domain

### OAuth Callback 404
- Ensure `FRONTEND_URL` is set in backend environment
- Verify frontend callback page exists at `/auth/youtube/callback`, `/auth/tiktok/callback`, or `/auth/instagram/callback`

### Environment Variables Not Loading
- Run `python -c "import dotenv; dotenv.load_dotenv(); import os; print(os.getenv('BASE_URL'))"` to test
- Restart server after changing `.env` files
- Check for typos in variable names

