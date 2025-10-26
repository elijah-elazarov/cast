# Instagram Graph API Setup - 2025 (With Posting Capabilities)

## 🎯 **Instagram Graph API for Content Publishing**

Based on the [Phyllo article](https://www.getphyllo.com/post/how-to-add-instagram-api-to-your-app-or-website), the Instagram Graph API is the **only way** to post content to Instagram (Reels, Stories, Posts). The Basic Display API is read-only.

## **✅ What You Get:**
- ✅ **Post Reels to Instagram**
- ✅ **Post Stories to Instagram**
- ✅ **Post regular posts to Instagram**
- ✅ **Read user profile and media**
- ✅ **Business account insights**
- ✅ **Full publishing capabilities**

## **❌ Requirements:**
- ❌ **Instagram Business or Creator account required**
- ❌ **Facebook Page connected to Instagram account**
- ❌ **Facebook App with Instagram Graph API product**
- ❌ **App review may be required for production**

## **🔧 Setup Steps:**

### **Step 1: Create Facebook App**

1. **Go to:** [Facebook Developers](https://developers.facebook.com/)
2. **Click:** "My Apps" → "Create App"
3. **Select:** "Business" (not Consumer)
4. **App Name:** "Cast Social Media App"
5. **App Contact Email:** your-email@example.com
6. **App Purpose:** "Other"

### **Step 2: Add Instagram Graph API Product**

1. **In your app dashboard:**
   - Click "Add Product"
   - Find "Instagram Graph API"
   - Click "Set Up"

2. **Configure Instagram Graph API:**
   - **Valid OAuth Redirect URIs:** `https://cast-five.vercel.app/auth/instagram/callback`
   - **Deauthorize Callback URL:** `https://cast-five.vercel.app/auth/instagram/callback`
   - **Data Deletion Request URL:** `https://cast-five.vercel.app/auth/instagram/callback`

### **Step 3: Add Facebook Login Product**

1. **Add Product:** Facebook Login
2. **Configure Facebook Login:**
   - **Valid OAuth Redirect URIs:** `https://cast-five.vercel.app/auth/instagram/callback`
   - **App Domains:** `cast-five.vercel.app`

### **Step 4: Set App Permissions**

**Required Permissions:**
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`

### **Step 5: Connect Instagram Business Account**

1. **Create Facebook Page** (if you don't have one)
2. **Convert Instagram to Business Account:**
   - Go to Instagram Settings
   - Switch to Professional Account
   - Choose Business Account
3. **Connect to Facebook Page:**
   - In Instagram Settings → Account → Linked Accounts
   - Connect to your Facebook Page

### **Step 6: Get App Credentials**

1. **App ID:** Copy from "App ID" field
2. **App Secret:** Click "Show" next to "App Secret" and copy

### **Step 7: Update Environment Variables**

**Backend (.env):**
```env
# Instagram Graph API (2025) - Business Account API with Posting Capabilities
FACEBOOK_APP_ID=717044718072411
FACEBOOK_APP_SECRET=884aa846ae8dbb2212f757748cda486d
INSTAGRAM_REDIRECT_URI=https://cast-five.vercel.app/auth/instagram/callback
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_BACKEND_URL=https://backrooms-e8nm.onrender.com
```

### **Step 8: Test the API**

**Test Auth URL:**
```bash
curl -s https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://www.facebook.com/v21.0/dialog/oauth?client_id=...",
    "state": "random_state_token"
  }
}
```

## **🚀 How to Use:**

### **1. Get Auth URL:**
```bash
GET /api/instagram/graph/auth-url
```

### **2. User Authorizes:**
- User clicks auth URL
- User logs into Facebook
- User grants permissions to your app
- User is redirected to callback

### **3. Exchange Code for Token:**
```bash
POST /api/instagram/graph/login
{
  "code": "authorization_code_from_callback"
}
```

### **4. Upload Reel:**
```bash
POST /api/instagram/graph/upload-reel
{
  "user_id": "instagram_user_id",
  "video_url": "https://example.com/video.mp4",
  "caption": "Check out this amazing video! #reels"
}
```

### **5. Upload Story:**
```bash
POST /api/instagram/graph/upload-story
{
  "user_id": "instagram_user_id",
  "video_url": "https://example.com/story.mp4",
  "caption": "Behind the scenes!"
}
```

## **📱 Frontend Integration:**

```typescript
// Get auth URL
const response = await fetch('/api/instagram/graph/auth-url');
const { data } = await response.json();

// Redirect user to Facebook/Instagram
window.location.href = data.auth_url;

// Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Exchange code for token
  const loginResponse = await fetch('/api/instagram/graph/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  const result = await loginResponse.json();
  console.log('Instagram connected:', result.data);
}

// Upload Reel
const uploadReel = async (videoUrl: string, caption: string) => {
  const response = await fetch('/api/instagram/graph/upload-reel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'instagram_user_id',
      video_url: videoUrl,
      caption: caption
    })
  });
  
  const result = await response.json();
  console.log('Reel uploaded:', result.data);
};

// Upload Story
const uploadStory = async (mediaUrl: string, caption: string) => {
  const response = await fetch('/api/instagram/graph/upload-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'instagram_user_id',
      video_url: mediaUrl, // or image_url for images
      caption: caption
    })
  });
  
  const result = await response.json();
  console.log('Story uploaded:', result.data);
};
```

## **🔍 API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/graph/auth-url` | GET | Get OAuth authorization URL |
| `/api/instagram/graph/login` | POST | Exchange code for access token |
| `/api/instagram/graph/upload-reel` | POST | Upload and publish Reel |
| `/api/instagram/graph/upload-story` | POST | Upload and publish Story |

## **⚠️ Important Notes:**

1. **Business Account Required:** Only works with Instagram Business or Creator accounts
2. **Facebook Page Required:** Instagram account must be connected to a Facebook Page
3. **App Review:** May need app review for production use
4. **Video Requirements:** Videos must be publicly accessible HTTPS URLs
5. **File Size Limits:** Check Instagram's current file size limits

## **🔄 Video Upload Process:**

1. **Upload video to cloud storage** (AWS S3, Google Cloud, etc.)
2. **Get public HTTPS URL** for the video
3. **Create media container** using the URL
4. **Publish the content** to Instagram

## **🎉 Success!**

You now have a working Instagram integration that:
- ✅ Authenticates users
- ✅ Posts Reels to Instagram
- ✅ Posts Stories to Instagram
- ✅ Posts regular content to Instagram
- ✅ Reads user profiles and media
- ✅ Full publishing capabilities

## **📚 References:**

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Phyllo Instagram API Guide](https://www.getphyllo.com/post/how-to-add-instagram-api-to-your-app-or-website)
- [Facebook App Setup Guide](https://developers.facebook.com/docs/apps/)