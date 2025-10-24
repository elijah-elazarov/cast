# Instagram Meta API Migration Plan

## Overview
Migrating from unofficial `instagrapi` library to official **Meta Instagram Graph API** (Content Publishing API) for posting Reels.

---

## Meta Instagram Graph API Requirements

### Prerequisites
1. **Instagram Business Account** or **Instagram Creator Account**
2. **Facebook Page** connected to the Instagram account
3. **Meta App** with Instagram Graph API permissions
4. **App Review** for Instagram Content Publishing permissions

### Required Permissions/Scopes
- `instagram_basic` - Basic Instagram account info
- `instagram_content_publish` - Publish content to Instagram
- `pages_read_engagement` - Read Page data
- `pages_show_list` - List Pages user manages

### API Endpoints We'll Use
1. **OAuth Authorization**: `https://www.facebook.com/v18.0/dialog/oauth`
2. **Token Exchange**: `https://graph.facebook.com/v18.0/oauth/access_token`
3. **Get Instagram Business Account ID**: `GET /{facebook-page-id}?fields=instagram_business_account`
4. **Create Media Container** (Reels): `POST /{ig-user-id}/media`
5. **Publish Media**: `POST /{ig-user-id}/media_publish`

---

## Architecture (Similar to YouTube)

### OAuth Flow
```
1. User clicks "Connect Instagram" → Frontend
2. Frontend calls → Backend /api/instagram/meta/auth-url
3. Backend generates Meta OAuth URL with redirect_uri = {BASE_URL}/auth/instagram/callback
4. User authorizes on Facebook/Meta
5. Meta redirects to → Backend {BASE_URL}/auth/instagram/callback?code=xyz
6. Backend redirects to → Frontend {FRONTEND_URL}/auth/instagram/callback?code=xyz
7. Frontend processes code → Backend /api/instagram/meta/login
8. Backend exchanges code for access token → Gets Instagram Business Account ID
9. Backend stores session with tokens and account info
10. Frontend receives user info → Updates UI
```

### Upload Reels Flow
```
1. User uploads video file → Frontend
2. Frontend sends to → Backend /api/instagram/upload-reel-meta
3. Backend uploads video to temporary hosting (or uses public URL)
4. Backend creates media container:
   POST /{ig-user-id}/media
   {
     "media_type": "REELS",
     "video_url": "https://...",
     "caption": "..."
   }
5. Backend gets creation_id from response
6. Backend publishes media:
   POST /{ig-user-id}/media_publish
   {
     "creation_id": "{creation_id}"
   }
7. Backend returns success with media ID
```

---

## Implementation Steps

### Step 1: Backend - Add Meta OAuth Configuration

Add to `backend/main.py`:

```python
# Meta/Instagram OAuth configuration
META_APP_ID = os.getenv('META_APP_ID', '')
META_APP_SECRET = os.getenv('META_APP_SECRET', '')
META_REDIRECT_URI = f'{BASE_URL}/auth/instagram/callback'
META_SCOPES = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement',
    'pages_show_list'
]

# Store Instagram sessions (Meta API)
instagram_meta_sessions = {}
```

### Step 2: Backend - Create Meta OAuth Endpoints

#### GET /api/instagram/meta/auth-url
```python
@app.get("/api/instagram/meta/auth-url")
async def get_instagram_meta_auth_url():
    """Generate Meta OAuth URL for Instagram"""
    try:
        import secrets
        state = secrets.token_urlsafe(32)
        
        auth_url = (
            f"https://www.facebook.com/v18.0/dialog/oauth?"
            f"client_id={META_APP_ID}"
            f"&redirect_uri={META_REDIRECT_URI}"
            f"&scope={','.join(META_SCOPES)}"
            f"&response_type=code"
            f"&state={state}"
        )
        
        return JSONResponse({
            "success": True,
            "data": {
                "auth_url": auth_url,
                "state": state
            }
        })
    except Exception as e:
        logger.error(f"Meta auth URL error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### GET /auth/instagram/callback
```python
@app.get("/auth/instagram/callback")
async def instagram_meta_oauth_callback(code: str = None, state: str = None, error: str = None):
    """Handle Meta OAuth callback - redirect to frontend"""
    try:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        if error:
            social_logger.error(f"INSTAGRAM_META_OAUTH_ERROR - Error: {error}")
            return RedirectResponse(url=f"{frontend_url}/?instagram_error={error}")
        
        if not code:
            social_logger.error("INSTAGRAM_META_OAUTH_ERROR - No authorization code received")
            return RedirectResponse(url=f"{frontend_url}/?instagram_error=no_code")
        
        social_logger.info(f"INSTAGRAM_META_OAUTH_CALLBACK - Code received: {code[:10]}...")
        
        redirect_url = f"{frontend_url}/auth/instagram/callback?code={code}"
        if state:
            redirect_url += f"&state={state}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        social_logger.error(f"INSTAGRAM_META_OAUTH_CALLBACK_ERROR - Error: {str(e)}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/?instagram_error=callback_failed")
```

#### POST /api/instagram/meta/login
```python
@app.post("/api/instagram/meta/login")
async def instagram_meta_login(request: dict):
    """Exchange code for Meta access token and get Instagram account"""
    try:
        import requests
        
        code = request.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code required")
        
        # Exchange code for access token
        token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        token_params = {
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "redirect_uri": META_REDIRECT_URI,
            "code": code
        }
        
        token_response = requests.get(token_url, params=token_params)
        token_data = token_response.json()
        
        if 'access_token' not in token_data:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        access_token = token_data['access_token']
        
        # Get Facebook Pages
        pages_url = f"https://graph.facebook.com/v18.0/me/accounts"
        pages_response = requests.get(pages_url, params={"access_token": access_token})
        pages_data = pages_response.json()
        
        if 'data' not in pages_data or len(pages_data['data']) == 0:
            raise HTTPException(status_code=404, detail="No Facebook Pages found. Connect Instagram to a Facebook Page first.")
        
        # Get first page (user can select if multiple)
        page = pages_data['data'][0]
        page_id = page['id']
        page_access_token = page['access_token']
        
        # Get Instagram Business Account
        ig_account_url = f"https://graph.facebook.com/v18.0/{page_id}"
        ig_account_response = requests.get(
            ig_account_url,
            params={
                "fields": "instagram_business_account",
                "access_token": page_access_token
            }
        )
        ig_account_data = ig_account_response.json()
        
        if 'instagram_business_account' not in ig_account_data:
            raise HTTPException(
                status_code=404,
                detail="No Instagram Business Account connected to this Facebook Page"
            )
        
        ig_user_id = ig_account_data['instagram_business_account']['id']
        
        # Get Instagram account info
        ig_info_url = f"https://graph.facebook.com/v18.0/{ig_user_id}"
        ig_info_response = requests.get(
            ig_info_url,
            params={
                "fields": "username,profile_picture_url,followers_count,media_count",
                "access_token": page_access_token
            }
        )
        ig_info = ig_info_response.json()
        
        # Store session
        instagram_meta_sessions[ig_user_id] = {
            'access_token': page_access_token,
            'ig_user_id': ig_user_id,
            'username': ig_info.get('username'),
            'page_id': page_id,
            'followers_count': ig_info.get('followers_count', 0)
        }
        
        social_logger.info(f"INSTAGRAM_META_CONNECTED - User: {ig_info.get('username')} | ID: {ig_user_id} | Followers: {ig_info.get('followers_count', 0)}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": ig_user_id,
                "username": ig_info.get('username'),
                "followers_count": ig_info.get('followers_count', 0),
                "profile_picture_url": ig_info.get('profile_picture_url')
            },
            "message": "Successfully connected to Instagram"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram Meta login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
```

### Step 3: Backend - Create Reel Upload Endpoint

```python
@app.post("/api/instagram/upload-reel-meta")
async def upload_reel_meta(
    file: UploadFile = File(...),
    caption: str = Form(""),
    user_id: str = Form("")
):
    """Upload Reel using Meta Instagram Graph API"""
    temp_path = None
    try:
        import requests
        
        if not user_id or user_id not in instagram_meta_sessions:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        session = instagram_meta_sessions[user_id]
        access_token = session['access_token']
        ig_user_id = session['ig_user_id']
        
        # Save video temporarily
        temp_path = f"/tmp/instagram_reel_{user_id}_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        file_size = os.path.getsize(temp_path)
        
        social_logger.info(f"INSTAGRAM_META_UPLOAD_START - User: {user_id} | File: {file.filename} | Caption: {caption[:50]}...")
        
        # Note: For Meta API, video must be publicly accessible
        # Option 1: Upload to cloud storage (S3, CloudFlare R2, etc.) and get public URL
        # Option 2: Use resumable upload (for large files)
        # For now, we'll need to implement cloud storage upload
        
        # TODO: Upload video to cloud storage and get public URL
        # video_url = upload_to_cloud_storage(temp_path)
        
        raise HTTPException(
            status_code=501,
            detail="Cloud storage integration required. Video must be publicly accessible for Meta API."
        )
        
        # Once we have video_url:
        # Step 1: Create media container
        # create_media_url = f"https://graph.facebook.com/v18.0/{ig_user_id}/media"
        # create_media_data = {
        #     "media_type": "REELS",
        #     "video_url": video_url,
        #     "caption": caption,
        #     "access_token": access_token
        # }
        # 
        # create_response = requests.post(create_media_url, data=create_media_data)
        # create_result = create_response.json()
        # 
        # if 'id' not in create_result:
        #     raise HTTPException(status_code=400, detail="Failed to create media container")
        # 
        # creation_id = create_result['id']
        # 
        # # Step 2: Publish media
        # publish_url = f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish"
        # publish_data = {
        #     "creation_id": creation_id,
        #     "access_token": access_token
        # }
        # 
        # publish_response = requests.post(publish_url, data=publish_data)
        # publish_result = publish_response.json()
        # 
        # if 'id' not in publish_result:
        #     raise HTTPException(status_code=400, detail="Failed to publish media")
        # 
        # media_id = publish_result['id']
        # 
        # # Clean up
        # if temp_path and os.path.exists(temp_path):
        #     os.remove(temp_path)
        # 
        # social_logger.info(f"INSTAGRAM_META_UPLOAD_SUCCESS - User: {user_id} | Media ID: {media_id}")
        # 
        # return JSONResponse({
        #     "success": True,
        #     "data": {
        #         "media_id": media_id
        #     },
        #     "message": "Reel uploaded successfully"
        # })
        
    except HTTPException:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        social_logger.error(f"INSTAGRAM_META_UPLOAD_FAILED - User: {user_id} | Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 4: Frontend - Create Callback Page

Create `/src/app/auth/instagram/callback/page.tsx`:

```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InstagramCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing Instagram connection...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was denied');
        setTimeout(() => {
          window.location.href = '/?instagram_error=denied';
        }, 2000);
        return;
      }

      if (code) {
        setStatus('processing');
        setMessage('Processing authorization...');
        
        try {
          const response = await fetch('/api/instagram/meta/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (data.success) {
            setStatus('success');
            setMessage('Connection successful! Redirecting...');
            
            // Store credentials
            localStorage.setItem('instagram_user_id', data.data.user_id);
            localStorage.setItem('instagram_username', data.data.username);
            
            setTimeout(() => {
              window.location.href = '/?instagram_connected=true';
            }, 1000);
          } else {
            setStatus('error');
            setMessage('Failed to connect. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?instagram_error=failed';
            }, 2000);
          }
        } catch (err) {
          console.error('Instagram login error:', err);
          setStatus('error');
          setMessage('An error occurred. Redirecting...');
          setTimeout(() => {
            window.location.href = '/?instagram_error=error';
          }, 2000);
        }
      } else {
        window.location.href = '/';
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
        )}
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="rounded-full h-12 w-12 bg-green-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="rounded-full h-12 w-12 bg-red-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
      </div>
    </div>
  );
}

export default function InstagramCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <InstagramCallbackContent />
    </Suspense>
  );
}
```

### Step 5: Environment Variables

Add to `backend/.env`:
```env
# Meta/Instagram OAuth
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

### Step 6: Create API Proxy Routes

Create `/src/app/api/instagram/meta/auth-url/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/instagram/meta/auth-url`);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram Meta auth-url proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}
```

Create `/src/app/api/instagram/meta/login/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    
    const response = await fetch(`${backendUrl}/api/instagram/meta/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Instagram Meta login proxy error:', error);
    return NextResponse.json(
      { success: false, detail: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}
```

---

## Key Differences from instagrapi

### Advantages of Meta API
✅ **Official and supported** by Meta/Facebook/Instagram  
✅ **More reliable** - no account bans or blocks  
✅ **Better rate limits** for business accounts  
✅ **Access to analytics** and insights  
✅ **Future-proof** - won't break with Instagram updates  

### Requirements
⚠️ **Instagram Business or Creator Account** required  
⚠️ **Facebook Page connection** required  
⚠️ **App Review** needed for Content Publishing permission  
⚠️ **Video hosting** - videos must be publicly accessible via URL  
⚠️ **More setup** - OAuth flow instead of username/password  

### Limitations
❌ **Personal accounts** cannot use this API  
❌ **Videos must be hosted** publicly (need cloud storage)  
❌ **Processing time** - Reels may take time to process  
❌ **Stricter content policies** enforced by Meta  

---

## Cloud Storage Integration Needed

For Meta API to work, videos must be publicly accessible. Options:

### Option 1: AWS S3
```python
import boto3

s3_client = boto3.client('s3')
s3_client.upload_file(temp_path, 'bucket-name', 'video.mp4')
video_url = f"https://bucket-name.s3.amazonaws.com/video.mp4"
```

### Option 2: Cloudflare R2
```python
import boto3

r2_client = boto3.client(
    's3',
    endpoint_url='https://...r2.cloudflarestorage.com',
    aws_access_key_id='...',
    aws_secret_access_key='...'
)
```

### Option 3: Temporary Public URL
- Use a service like `transfer.sh` or similar
- Only keep video public during upload process
- Delete after Meta processes it

---

## Migration Strategy

### Phase 1: Parallel Implementation ✅
- Keep existing `instagrapi` code working
- Add new Meta API endpoints alongside
- Test Meta API thoroughly

### Phase 2: Feature Flag
- Add option to switch between instagrapi and Meta API
- Let users choose their preferred method

### Phase 3: Full Migration
- Deprecate instagrapi
- Make Meta API the default
- Keep instagrapi as fallback for personal accounts

---

## Next Steps

1. ✅ Get Meta App ID and Secret from Facebook Developer Portal
2. ✅ Set up Instagram Business Account
3. ✅ Connect Instagram to Facebook Page
4. ✅ Request Content Publishing permissions (App Review)
5. ✅ Choose and implement cloud storage solution
6. ✅ Implement backend OAuth endpoints
7. ✅ Create frontend callback page
8. ✅ Update InstagramConnection component
9. ✅ Test complete flow
10. ✅ Deploy to production

---

## Testing Checklist

- [ ] Meta OAuth flow completes successfully
- [ ] Instagram Business Account info retrieved
- [ ] Video uploads to cloud storage
- [ ] Media container created successfully
- [ ] Reel publishes to Instagram
- [ ] Error handling works for all failure cases
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

---

## Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Instagram Reels](https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#reels)
- [Meta App Dashboard](https://developers.facebook.com/apps)
Human: continue
