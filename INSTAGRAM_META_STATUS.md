# Instagram Meta API Integration - Status Report

## ✅ Completed Steps

### Backend Implementation
1. **Meta OAuth Configuration Added** (`backend/main.py`)
   - Added `META_APP_ID`, `META_APP_SECRET` environment variables
   - Added `META_REDIRECT_URI` configuration
   - Added required Instagram scopes (7 permissions)
   - Created `instagram_meta_sessions` storage

2. **Meta OAuth Endpoints Created** (`backend/main.py`)
   - ✅ `GET /api/instagram/meta/auth-url` - Generates Meta OAuth URL
   - ✅ `GET /auth/instagram/callback` - Handles OAuth callback, redirects to frontend
   - ✅ `POST /api/instagram/meta/login` - Exchanges code for token, gets Instagram Business Account
   - ✅ `POST /api/instagram/meta/logout` - Clears Meta API session

3. **Environment Variables Updated**
   - ✅ `backend/.env` - Added `META_APP_ID` and `META_APP_SECRET`
   - ✅ `backend/render.yaml` - Added Meta env vars for deployment

### Frontend Implementation
4. **Callback Page Created**
   - ✅ `/src/app/auth/instagram/callback/page.tsx` - Handles OAuth redirect

5. **API Proxy Routes Created**
   - ✅ `/src/app/api/instagram/meta/auth-url/route.ts`
   - ✅ `/src/app/api/instagram/meta/login/route.ts`
   - ✅ `/src/app/api/instagram/meta/logout/route.ts`

---

## 🚧 Remaining Tasks

### 1. Update InstagramConnection Component
**Status:** Pending  
**File:** `/src/app/components/InstagramConnection.tsx`

**What needs to be done:**
- Add "Connect with Meta" button alongside existing login form
- Keep existing instagrapi login as fallback
- Handle OAuth flow similar to YouTube/TikTok
- Store `instagram_account_type` in localStorage to differentiate between methods

**Approach:**
```typescript
// Add new state
const [connectionMethod, setConnectionMethod] = useState<'instagrapi' | 'meta' | null>(null);

// Add Meta OAuth connect function
const handleMetaConnect = async () => {
  try {
    const response = await fetch('/api/instagram/meta/auth-url');
    const data = await response.json();
    if (data.success) {
      window.location.href = data.data.auth_url;
    }
  } catch (error) {
    setError('Failed to initiate connection');
  }
};

// Show two connection options
// Option 1: "Connect with Meta" (recommended for business accounts)
// Option 2: "Login with Username/Password" (existing instagrapi method)
```

### 2. Add Meta API Reel Upload Endpoint
**Status:** Pending  
**File:** `/backend/main.py`

**Challenge:** Meta API requires videos to be publicly accessible via URL

**What needs to be done:**
- Add `POST /api/instagram/upload-reel-meta` endpoint
- Implement cloud storage upload (S3, Cloudflare R2, or similar)
- Create media container with Meta API
- Publish the Reel

**Required for upload:**
```python
# Step 1: Upload video to cloud storage
video_url = upload_to_cloud_storage(video_file)

# Step 2: Create media container
POST https://graph.facebook.com/v18.0/{ig-user-id}/media
{
  "media_type": "REELS",
  "video_url": video_url,
  "caption": caption,
  "access_token": access_token
}

# Step 3: Publish media
POST https://graph.facebook.com/v18.0/{ig-user-id}/media_publish
{
  "creation_id": creation_id,
  "access_token": access_token
}
```

### 3. Cloud Storage Integration
**Status:** Not Started  
**Priority:** Required for Meta API uploads

**Options:**
1. **AWS S3** - Most common, well-documented
2. **Cloudflare R2** - S3-compatible, cheaper egress
3. **Temporary hosting** - Use service like transfer.sh (not recommended for production)

**What's needed:**
- Choose cloud storage provider
- Add credentials to environment variables
- Implement upload function
- Generate temporary public URLs
- Auto-delete after Meta processes video

### 4. Update VideoUploader Component
**Status:** Pending  
**File:** `/src/app/components/VideoUploader.tsx`

**What needs to be done:**
- Check if Instagram is connected via Meta or instagrapi
- Use appropriate upload endpoint based on connection method
- Handle Meta API-specific responses

### 5. Testing
**Status:** Not Started

**Testing Checklist:**
- [ ] Meta App created in Facebook Developers
- [ ] Instagram Business Account set up
- [ ] Facebook Page connected to Instagram
- [ ] App permissions requested and approved
- [ ] OAuth flow works (get auth URL → authorize → callback → login)
- [ ] User info retrieved correctly
- [ ] Cloud storage upload works
- [ ] Reel upload to Instagram successful
- [ ] Error handling for all failure cases
- [ ] Logout clears session properly

---

## 📋 Setup Requirements (For User)

### 1. Create Meta App
1. Go to [Facebook for Developers](https://developers.facebook.com/apps)
2. Create a new app (Business type)
3. Add "Instagram Graph API" product
4. Set up Instagram Basic Display or Instagram Business Login

### 2. Configure OAuth Redirect URI
Add to your Meta App's Valid OAuth Redirect URIs:
```
https://backrooms-e8nm.onrender.com/auth/instagram/callback
```

### 3. Request Permissions
Request these permissions in App Review:
- `instagram_basic`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`
- `instagram_content_publish`
- `instagram_manage_comments`
- `instagram_manage_insights`

### 4. Get Credentials
Copy from your Meta App:
- **App ID** → `META_APP_ID`
- **App Secret** → `META_APP_SECRET`

### 5. Set Environment Variables

**In Render Dashboard:**
```
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

**In local `backend/.env`:**
```
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

### 6. Instagram Account Requirements
- Must be Instagram **Business** or **Creator** account
- Must be connected to a Facebook Page
- Cannot use personal Instagram accounts

---

## 🔄 Migration Strategy

### Phase 1: Parallel Implementation (Current)
✅ Keep existing instagrapi code working  
✅ Add Meta API as alternative option  
⏳ Let users choose their preferred method  

### Phase 2: Gradual Migration
- Default to Meta API for business accounts
- Fall back to instagrapi for personal accounts
- Add UI to switch between methods

### Phase 3: Full Migration (Future)
- Make Meta API the primary method
- Deprecate instagrapi (keep as legacy option)
- Remove instagrapi dependency (optional)

---

## 📊 Comparison: instagrapi vs Meta API

| Feature | instagrapi (Current) | Meta API (New) |
|---------|---------------------|----------------|
| **Account Type** | Personal & Business | Business only |
| **Setup** | Username/Password | OAuth + Facebook Page |
| **Reliability** | Can break with IG updates | Official, stable |
| **Rate Limits** | Unofficial limits | Official API limits |
| **Risk** | Potential account bans | No ban risk |
| **Video Hosting** | Direct upload | Requires public URL |
| **2FA** | Supported | Not needed |
| **Maintenance** | May break | Future-proof |

---

## 🎯 Next Steps (Priority Order)

1. **Get Meta App Credentials** (User task)
   - Create Meta app
   - Get App ID and Secret
   - Configure redirect URI
   - Request permissions

2. **Update InstagramConnection Component**
   - Add Meta OAuth flow
   - Keep instagrapi as fallback
   - Test OAuth connection

3. **Choose Cloud Storage Provider**
   - Research options (S3, R2, etc.)
   - Set up account and credentials
   - Test upload/download

4. **Implement Reel Upload**
   - Add cloud storage integration
   - Create Meta API upload endpoint
   - Test end-to-end upload

5. **Update UI & Test**
   - Update VideoUploader component
   - Full end-to-end testing
   - Deploy to production

---

## 📖 Documentation References

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Post documentation](https://docs.postiz.com/providers/instagram)
- [Meta App Dashboard](https://developers.facebook.com/apps)

---

## ✨ Benefits of Meta API Integration

1. **Official Support** - No more worrying about unofficial API breaking
2. **Better Reliability** - Stable, supported by Meta/Facebook
3. **No Account Bans** - Use official OAuth, no password sharing
4. **Future-Proof** - Won't break with Instagram updates
5. **Access to Insights** - Can add analytics features later
6. **Professional** - Better for business use cases

---

**Current Status:** Backend OAuth flow complete, frontend needs UI updates, upload requires cloud storage.  
**Blockers:** None - all ready to proceed with remaining tasks.  
**Est. Time to Complete:** 2-4 hours (excluding Meta app approval wait time)

